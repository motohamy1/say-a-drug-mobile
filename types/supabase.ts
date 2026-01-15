export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            drugs: {
                Row: {
                    id: string
                    created_at: string
                    trade_name: string | null
                    "Drugname": string | null
                    scientific_name: string | null
                    price: number | null
                    "Price": number | null
                    currency: string
                    manufacturer: string | null
                    "Company": string | null
                    description: string | null
                    image_url: string | null
                    active_ingredients: string[] | null
                    dosage_form: string | null
                    "Form": string | null
                    strength: string | null
                    "Search Query": string | null
                    "Date": string | null
                    "Price_prev": number | null
                    "Price Changed": boolean | null
                    "Region": string | null
                    "Category": string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    trade_name?: string | null
                    "Drugname"?: string | null
                    scientific_name?: string | null
                    price?: number | null
                    "Price"?: number | null
                    currency?: string
                    manufacturer?: string | null
                    "Company"?: string | null
                    description?: string | null
                    image_url?: string | null
                    active_ingredients?: string[] | null
                    dosage_form?: string | null
                    "Form"?: string | null
                    strength?: string | null
                    "Search Query"?: string | null
                    "Date"?: string | null
                    "Price_prev"?: number | null
                    "Price Changed"?: boolean | null
                    "Region"?: string | null
                    "Category"?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    trade_name?: string | null
                    "Drugname"?: string | null
                    scientific_name?: string | null
                    price?: number | null
                    "Price"?: number | null
                    currency?: string
                    manufacturer?: string | null
                    "Company"?: string | null
                    description?: string | null
                    image_url?: string | null
                    active_ingredients?: string[] | null
                    dosage_form?: string | null
                    "Form"?: string | null
                    strength?: string | null
                    "Search Query"?: string | null
                    "Date"?: string | null
                    "Price_prev"?: number | null
                    "Price Changed"?: boolean | null
                    "Region"?: string | null
                    "Category"?: string | null
                }
                Relationships: []
            }
            user_favorites: {
                Row: {
                    user_id: string
                    drug_id: string
                    created_at: string
                }
                Insert: {
                    user_id: string
                    drug_id: string
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    drug_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_favorites_drug_id_fkey"
                        columns: ["drug_id"]
                        referencedRelation: "drugs"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "user_favorites_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
