-- Migration: Add image_public_id to products table for Cloudinary asset lifecycle management
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);

