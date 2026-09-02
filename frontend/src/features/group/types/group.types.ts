export interface GroupCreate {
    name: string;
    description: string;
    group_image: File
}
export interface GroupUser{
    id:number
    email:string
    name:string
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
    // group_imagekey?: string | null
    group_image_url?: string | null
    created_by: {
        id: number
        email: string
        name: string
    }
}

export interface UserGroupResponse{
id:number
name:string
description?:string
group_image_url?:string|null
}

export interface GroupMemberResponse{
    id:number
    name:string
    email:string
    profile_image_url?:string | null
    role:string
}
export interface GroupBalanceResponse {
  success: boolean;
  message: string;
  data: GroupBalances;
}
export type GroupBalances = Record<string, number>;

