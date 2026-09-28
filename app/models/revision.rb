class Revision < ApplicationRecord
  belongs_to :page

  validates :number, presence: true, uniqueness: { scope: :page_id }

  def to_param
    number.to_s
  end

  def previous
    page.revisions.where(number: ...number).first
  end

  def diff_from_previous
    LineDiff.new(previous&.body.to_s, body)
  end
end
