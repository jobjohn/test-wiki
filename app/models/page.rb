class Page < ApplicationRecord
  TITLE_MAX_LENGTH = 200

  belongs_to :parent, class_name: "Page", optional: true
  has_many :children, -> { order(:position, :title) }, class_name: "Page", foreign_key: :parent_id,
           dependent: :destroy, inverse_of: :parent
  has_many :taggings, dependent: :destroy
  has_many :tags, -> { order(:name) }, through: :taggings
  has_many :revisions, -> { order(number: :desc) }, dependent: :delete_all, inverse_of: :page

  normalizes :title, with: ->(title) { title.to_s.squish }
  normalizes :body, with: ->(body) { body.to_s.gsub("\r\n", "\n") }

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH },
                    uniqueness: { case_sensitive: false }
  validate :parent_must_not_create_cycle

  # 編集時の変更内容メモ（履歴に記録される）
  attr_accessor :edit_summary

  after_save :record_revision, if: -> { saved_change_to_title? || saved_change_to_body? }
  after_save :save_tag_list, if: -> { @tag_list }

  scope :roots, -> { where(parent_id: nil).order(:position, :title) }
  scope :recently_updated, -> { order(updated_at: :desc) }

  # 全角/半角スペース区切りの全キーワードを含むページを検索
  scope :search, ->(query) {
    terms = query.to_s.split(/[[:space:]]+/).reject(&:blank?).first(10)
    terms.inject(all) do |scope, term|
      pattern = "%#{sanitize_sql_like(term)}%"
      scope.where("pages.title LIKE :q OR pages.body LIKE :q", q: pattern)
    end
  }

  def self.find_by_title(title)
    where("lower(title) = ?", title.to_s.squish.downcase).first
  end

  def tag_list
    @tag_list || tags.map(&:name).join(", ")
  end

  # カンマ・読点・空白区切りでタグを受け取る
  def tag_list=(value)
    @tag_list = value.to_s
  end

  def tag_names
    tag_list.split(/[,、，[:space:]]+/).map { |name| name.delete("/").strip.first(50) }
            .reject(&:blank?).uniq(&:downcase)
  end

  def ancestors
    node = parent
    list = []
    seen = Set.new
    while node && seen.add?(node.id)
      list.unshift(node)
      node = node.parent
    end
    list
  end

  # 自分自身と子孫ページの ID
  def self_and_descendant_ids
    tree = Page.pluck(:id, :parent_id).group_by(&:last)
    ids = []
    queue = [ id ]
    while (current = queue.shift)
      next if ids.include?(current)
      ids << current
      queue.concat(Array(tree[current]).map(&:first))
    end
    ids
  end

  def descendants_count
    self_and_descendant_ids.size - 1
  end

  # 親ページとして選択可能なページ
  def parent_candidates
    excluded = persisted? ? self_and_descendant_ids : []
    Page.where.not(id: excluded).order(:title)
  end

  def current_revision
    revisions.first
  end

  def restore!(revision)
    self.title = revision.title
    self.body = revision.body
    self.edit_summary = "第#{revision.number}版に復元"
    save!
  end

  private

  def parent_must_not_create_cycle
    return if parent_id.blank?

    if persisted? && self_and_descendant_ids.include?(parent_id)
      errors.add(:parent_id, "に自分自身または子孫ページは指定できません")
    elsif parent.nil?
      errors.add(:parent_id, "が存在しません")
    end
  end

  def record_revision
    next_number = (revisions.maximum(:number) || 0) + 1
    revisions.create!(title: title, body: body, summary: edit_summary.presence, number: next_number)
  end

  def save_tag_list
    self.tags = tag_names.map do |name|
      Tag.where("lower(name) = ?", name.downcase).first || Tag.create!(name: name)
    end
    @tag_list = nil
  end
end
