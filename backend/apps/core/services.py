import logging
import traceback
import uuid
from io import BytesIO

import boto3
from botocore.config import Config
from django.conf import settings
from PIL import Image, ImageOps

from apps.core.exceptions import UploadToStorjFailedErrror
from apps.core.models import AuditLog

logger = logging.getLogger(__name__)


def set_jwt_cookies(response, access_token):
    jwt_settings = settings.SIMPLE_JWT

    # set access token
    response.set_cookie(
        key=jwt_settings["AUTH_COOKIE"],
        value=access_token,
        secure=jwt_settings["AUTH_COOKIE_SECURE"],
        httponly=jwt_settings["AUTH_COOKIE_HTTP_ONLY"],
        samesite=jwt_settings["AUTH_COOKIE_SAMESITE"],
    )

    return response


def create_audit_log(*, user, action, model_name, message=""):
    AuditLog.objects.create(
        user=user, action=action, model_name=model_name, message=message
    )


def _get_s3_client():
    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.STORJ_ENDPOINT,
        aws_access_key_id=settings.STORJ_ACCESS_KEY,
        aws_secret_access_key=settings.STORJ_SECRET_KEY,
        config=Config(
            signature_version="s3v4", request_checksum_calculation="when_required"
        ),
    )

    return s3_client


def _generate_unique_name(*, folder, image):
    image_key = f"{folder}/{uuid.uuid4()}.webp"
    return image_key


def _prepare_image_for_upload(image):
    image.seek(0)
    source = ImageOps.exif_transpose(Image.open(image))
    source.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

    if source.mode in ("RGBA", "LA") or "transparency" in source.info:
        prepared = source.convert("RGBA")
    else:
        prepared = source.convert("RGB")

    output = BytesIO()
    prepared.save(output, format="WEBP", quality=82, method=6)
    output.seek(0)
    return output


def _upload_to_storj(*, folder, image):
    if not image:
        logger.warning("image_key wasn't provided.")
        return

    image_key = _generate_unique_name(folder=folder, image=image)
    s3_client = _get_s3_client()

    try:
        processed_image = _prepare_image_for_upload(image)
        binary_file_payload = processed_image.read()
        s3_client.put_object(
            Bucket=settings.STORJ_BUCKET_NAME,
            Key=image_key,
            Body=binary_file_payload,
            ContentType="image/webp",
            ContentLength=len(binary_file_payload),
            CacheControl="public, max-age=31536000, immutable",
        )

        return image_key
    except Exception as e:
        traceback.print_exc()
        logger.error("Upload to storj failed from logger,", e)
        raise UploadToStorjFailedErrror()


def _delete_from_storj(*, image_key):
    if not image_key:
        logger.warning("image_key wasn't provide.")
        return

    s3_client = _get_s3_client()

    try:
        logger.info(msg=f"deleting image from storj {image_key}")
        s3_client.delete_object(Bucket=settings.STORJ_BUCKET_NAME, Key=image_key)
    except Exception as e:
        logger.error(f"Failed to delete file {image_key} from storj.")


def get_storj_public_url(*, image_key):
    if not image_key:
        return None

    clean_key = str(image_key).lstrip("/")
    s3_client = _get_s3_client()

    try:
        return s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": settings.STORJ_BUCKET_NAME, "Key": clean_key},
            ExpiresIn=3600,
            HttpMethod="GET",
        )
    except Exception:
        logger.exception("Failed to generate presigned Storj URL for %s", clean_key)
        base_url = settings.STORJ_ENDPOINT.rstrip("/")
        bucket_name = settings.STORJ_BUCKET_NAME.strip("/")
        return f"{base_url}/{bucket_name}/{clean_key}"
