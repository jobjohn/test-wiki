class CreateWikiTables < ActiveRecord::Migration[8.0]
  def change
    create_table :pages do |t|
      t.string :title, null: false
      t.text :body, null: false, default: ""
      t.references :parent, foreign_key: { to_table: :pages }
      t.integer :position, null: false, default: 0
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_index :pages, "lower(title)", unique: true, name: "index_pages_on_lower_title"
    add_index :pages, :updated_at

    create_table :tags do |t|
      t.string :name, null: false
      t.timestamps
    end
    add_index :tags, "lower(name)", unique: true, name: "index_tags_on_lower_name"

    create_table :taggings do |t|
      t.references :page, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true
      t.timestamps
    end
    add_index :taggings, [ :page_id, :tag_id ], unique: true

    create_table :revisions do |t|
      t.references :page, null: false, foreign_key: true
      t.string :title, null: false
      t.text :body, null: false, default: ""
      t.string :summary
      t.integer :number, null: false
      t.timestamps
    end
    add_index :revisions, [ :page_id, :number ], unique: true

    create_table :uploads do |t|
      t.timestamps
    end
  end
end
