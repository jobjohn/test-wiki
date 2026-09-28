class Tag < ApplicationRecord
  has_many :taggings, dependent: :destroy
  has_many :pages, through: :taggings

  normalizes :name, with: ->(name) { name.to_s.strip }

  validates :name, presence: true, length: { maximum: 50 }, uniqueness: { case_sensitive: false }

  # ページ数付きで、使用中のタグのみ
  scope :with_counts, -> {
    joins(:taggings).group(:id).select("tags.*, COUNT(taggings.id) AS pages_count").order(:name)
  }

  def to_param
    name
  end
end
