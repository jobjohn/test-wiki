class AddUsersSettingsAndFolders < ActiveRecord::Migration[8.0]
  class MigrationPage < ActiveRecord::Base
    self.table_name = "pages"
  end

  class MigrationFolder < ActiveRecord::Base
    self.table_name = "folders"
  end

  def up
    create_table :users do |t|
      t.string :username, null: false
      t.string :display_name
      t.string :password_digest, null: false
      t.string :role, null: false, default: "editor"
      t.string :otp_secret
      t.datetime :otp_enabled_at
      t.text :otp_backup_codes
      t.integer :last_otp_at
      t.boolean :must_change_password, null: false, default: false
      t.datetime :last_sign_in_at
      t.timestamps
    end
    add_index :users, "lower(username)", unique: true, name: "index_users_on_lower_username"

    create_table :settings do |t|
      t.string :wiki_name, null: false, default: "Wiki"
      t.text :description
      t.string :primary_color, null: false, default: "#2563eb"
      t.string :secondary_color, null: false, default: "#0f172a"
      t.string :accent_color, null: false, default: "#f59e0b"
      t.string :color_mode, null: false, default: "system"
      t.boolean :public_read, null: false, default: false
      t.boolean :require_mfa, null: false, default: false
      t.datetime :setup_completed_at
      t.timestamps
    end

    create_table :folders do |t|
      t.string :name, null: false
      t.references :parent, foreign_key: { to_table: :folders }
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :folders, [ :parent_id, :name ], unique: true

    add_reference :pages, :folder, foreign_key: true
    add_reference :revisions, :user, foreign_key: { on_delete: :nullify }

    convert_parent_pages_to_folders

    remove_reference :pages, :parent, foreign_key: { to_table: :pages }
  end

  def down
    add_reference :pages, :parent, foreign_key: { to_table: :pages }
    remove_reference :revisions, :user, foreign_key: { on_delete: :nullify }
    remove_reference :pages, :folder, foreign_key: true
    drop_table :folders
    drop_table :settings
    drop_table :users
  end

  private

  # 子ページを持つページは同名のフォルダに変換し、子ページをその中へ移す
  def convert_parent_pages_to_folders
    MigrationPage.reset_column_information
    pages = MigrationPage.all.to_a
    parents = pages.map(&:parent_id).compact.uniq
    folder_for = {}

    resolve = lambda do |page_id|
      folder_for[page_id] ||= begin
        page = pages.find { |p| p.id == page_id }
        parent_folder = page.parent_id ? resolve.call(page.parent_id) : nil
        MigrationFolder.create!(name: page.title, parent_id: parent_folder, position: page.position).id
      end
    end

    pages.each do |page|
      folder_id =
        if parents.include?(page.id) then resolve.call(page.id)
        elsif page.parent_id then resolve.call(page.parent_id)
        end
      page.update_columns(folder_id: folder_id) if folder_id
    end
  end
end
