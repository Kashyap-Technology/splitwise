export interface GroupCreate {
    name: string;
    description: string;
    group_image: File
}

export interface GroupCreateResponse {
    id: number;
    name: string;
    description: string;
    group_imagekey: string
}

export interface GroupListResponse {
    id: number
    name: string
    description?: string
    group_imagekey?: string | null
    created_by: {
        id: number
        email: string
        name: string
    }
}

export interface GroupMemberResponse{
    id:number
    name:string
    email:string
    role:string
}