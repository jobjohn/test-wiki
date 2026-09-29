# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_09_28_234851) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "folders", force: :cascade do |t|
    t.string "name", null: false
    t.integer "parent_id"
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["parent_id", "name"], name: "index_folders_on_parent_id_and_name", unique: true
    t.index ["parent_id"], name: "index_folders_on_parent_id"
  end

  create_table "pages", force: :cascade do |t|
    t.string "title", null: false
    t.text "body", default: "", null: false
    t.integer "position", default: 0, null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "folder_id"
    t.index "lower(title)", name: "index_pages_on_lower_title", unique: true
    t.index ["folder_id"], name: "index_pages_on_folder_id"
    t.index ["updated_at"], name: "index_pages_on_updated_at"
  end

  create_table "revisions", force: :cascade do |t|
    t.integer "page_id", null: false
    t.string "title", null: false
    t.text "body", default: "", null: false
    t.string "summary"
    t.integer "number", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["page_id", "number"], name: "index_revisions_on_page_id_and_number", unique: true
    t.index ["page_id"], name: "index_revisions_on_page_id"
    t.index ["user_id"], name: "index_revisions_on_user_id"
  end

  create_table "settings", force: :cascade do |t|
    t.string "wiki_name", default: "Wiki", null: false
    t.text "description"
    t.string "primary_color", default: "#2563eb", null: false
    t.string "secondary_color", default: "#0f172a", null: false
    t.string "accent_color", default: "#f59e0b", null: false
    t.string "color_mode", default: "system", null: false
    t.boolean "public_read", default: false, null: false
    t.boolean "require_mfa", default: false, null: false
    t.datetime "setup_completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "taggings", force: :cascade do |t|
    t.integer "page_id", null: false
    t.integer "tag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["page_id", "tag_id"], name: "index_taggings_on_page_id_and_tag_id", unique: true
    t.index ["page_id"], name: "index_taggings_on_page_id"
    t.index ["tag_id"], name: "index_taggings_on_tag_id"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower(name)", name: "index_tags_on_lower_name", unique: true
  end

  create_table "uploads", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "username", null: false
    t.string "display_name"
    t.string "password_digest", null: false
    t.string "role", default: "editor", null: false
    t.string "otp_secret"
    t.datetime "otp_enabled_at"
    t.text "otp_backup_codes"
    t.integer "last_otp_at"
    t.boolean "must_change_password", default: false, null: false
    t.datetime "last_sign_in_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower(username)", name: "index_users_on_lower_username", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "folders", "folders", column: "parent_id"
  add_foreign_key "pages", "folders"
  add_foreign_key "revisions", "pages"
  add_foreign_key "revisions", "users", on_delete: :nullify
  add_foreign_key "taggings", "pages"
  add_foreign_key "taggings", "tags"
end
