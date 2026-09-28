class Upload < ApplicationRecord
  MAX_SIZE = 20.megabytes

  has_one_attached :file

  validate :file_must_be_valid

  def image?
    file.attached? && file.content_type.to_s.start_with?("image/")
  end

  private

  def file_must_be_valid
    if !file.attached?
      errors.add(:file, "を選択してください")
    elsif file.byte_size > MAX_SIZE
      errors.add(:file, "は#{MAX_SIZE / 1.megabyte}MB以下にしてください")
    end
  end
end
