class Folder < ApplicationRecord
  belongs_to :parent, class_name: "Folder", optional: true
  has_many :children, -> { order(:position, :name) }, class_name: "Folder", foreign_key: :parent_id,
           inverse_of: :parent, dependent: :restrict_with_error
  has_many :pages, -> { order(:position, :title) }, dependent: :restrict_with_error, inverse_of: :folder

  normalizes :name, with: ->(name) { name.to_s.squish }

  validates :name, presence: true, length: { maximum: 100 },
                   uniqueness: { scope: :parent_id, case_sensitive: false, message: "は同じ場所に既に存在します" }
  validate :parent_must_not_create_cycle

  scope :roots, -> { where(parent_id: nil).order(:position, :name) }

  def ancestors
    list = []
    node = parent
    seen = Set.new
    while node && seen.add?(node.id)
      list.unshift(node)
      node = node.parent
    end
    list
  end

  def path_name
    [ *ancestors.map(&:name), name ].join(" / ")
  end

  def self_and_descendant_ids
    tree = Folder.pluck(:id, :parent_id).group_by(&:last)
    ids = []
    queue = [ id ]
    while (current = queue.shift)
      next if ids.include?(current)
      ids << current
      queue.concat(Array(tree[current]).map(&:first))
    end
    ids
  end

  # 移動先として選択可能なフォルダ
  def parent_candidates
    excluded = persisted? ? self_and_descendant_ids : []
    self.class.options_for_select.reject { |_, id| excluded.include?(id) }
  end

  # フォルダを削除し、中身（サブフォルダ・ページ）は 1 つ上の階層へ移動する
  def dissolve!
    transaction do
      children.each do |child|
        child.update!(parent_id: parent_id)
      end
      pages.update_all(folder_id: parent_id)
      reload.destroy!
    end
  end

  # [["親 / 子", id], ...] の形式で全フォルダを階層順に返す
  def self.options_for_select
    rows = order(:position, :name).pluck(:id, :name, :parent_id)
    by_parent = rows.group_by(&:last)
    result = []
    walk = lambda do |parent_id, prefix, seen|
      Array(by_parent[parent_id]).each do |id, name, _|
        next if seen.include?(id)
        label = prefix ? "#{prefix} / #{name}" : name
        result << [ label, id ]
        walk.call(id, label, seen + [ id ])
      end
    end
    walk.call(nil, nil, [])
    result
  end

  private

  def parent_must_not_create_cycle
    return if parent_id.blank?

    if persisted? && self_and_descendant_ids.include?(parent_id)
      errors.add(:parent_id, "に自分自身またはサブフォルダは指定できません")
    elsif parent.nil?
      errors.add(:parent_id, "が存在しません")
    end
  end
end
