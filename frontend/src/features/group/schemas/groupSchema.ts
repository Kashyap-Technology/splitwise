import { z } from 'zod'

const MAX_FILE_SIZE=5*1024*1024
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const groupSchema = z.object({
    name: z.string().min(1, { message: 'Group Name is Required' })
    .max(50, { message: 'Group Name Cannot exceed 50 characters' }),
    description: z.string().min(1, { message: 'Group Description is required' }).max(100, { message: 'Group Description cannot exceed 100 characters' }).optional(),
    group_image:z.instanceof(File,{message:'Please select an image.'})
    .refine((file)=>file.size<=MAX_FILE_SIZE,'Max size is 5MB')
    .refine((file)=>ACCEPTED_IMAGE_TYPES.includes(file.type),'Unsupported Format')
    // group_image: z.instanceof(File).optional().or(z.undefined())
})
 
export type CreateGroupInputs=z.infer<typeof groupSchema>
