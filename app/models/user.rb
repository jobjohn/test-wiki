class User < ApplicationRecord
  DEFAULT_ADMIN_USERNAME = "wikiadmin"
  ROLES = { "admin" => "管理者", "editor" => "編集者", "viewer" => "閲覧者" }.freeze
  BACKUP_CODE_COUNT = 10

  has_secure_password
  encrypts :otp_secret
  serialize :otp_backup_codes, coder: JSON, type: Array

  has_many :revisions, dependent: :nullify

  normalizes :username, with: ->(name) { name.to_s.strip }
  normalizes :display_name, with: ->(name) { name.to_s.squish.presence }

  validates :username, presence: true, uniqueness: { case_sensitive: false },
                       format: { with: /\A[a-zA-Z0-9_.\-]{3,32}\z/, message: "は半角英数字と _ . - で 3〜32 文字にしてください" }
  validates :display_name, length: { maximum: 50 }
  validates :password, length: { minimum: 8, maximum: 72 }, allow_nil: true
  validates :role, inclusion: { in: ROLES.keys }
  validate :keep_at_least_one_admin, on: :update

  before_destroy :prevent_destroying_last_admin

  scope :admins, -> { where(role: "admin") }

  def self.find_by_username(username)
    where("lower(username) = ?", username.to_s.strip.downcase).first
  end

  def self.default_admin_password
    ENV["WIKI_ADMIN_PASSWORD"].presence || DEFAULT_ADMIN_USERNAME
  end

  # ユーザーが 1 人もいなければ初期管理者 wikiadmin を作成する
  def self.ensure_default_admin!
    return if exists?

    create!(username: DEFAULT_ADMIN_USERNAME, display_name: "Wiki 管理者", role: "admin",
            password: default_admin_password, must_change_password: true)
  end

  def name
    display_name || username
  end

  def role_name
    ROLES[role]
  end

  def admin? = role == "admin"
  def can_edit? = admin? || role == "editor"

  # パスワード変更でログイン中の他セッションを無効化するためのトークン
  def session_token
    Digest::SHA256.hexdigest("#{id}:#{password_digest}")[0, 32]
  end

  # --- MFA（認証アプリのワンタイムパスコード） ---

  def mfa_enabled?
    otp_enabled_at.present? && otp_secret.present?
  end

  def self.generate_otp_secret
    ROTP::Base32.random
  end

  def self.otp_uri(secret, username, issuer)
    ROTP::TOTP.new(secret, issuer: issuer).provisioning_uri(username)
  end

  def self.valid_otp?(secret, code)
    ROTP::TOTP.new(secret).verify(normalize_code(code), drift_behind: 30, drift_ahead: 30).present?
  end

  def self.normalize_code(code)
    code.to_s.gsub(/[\s-]/, "")
  end

  # パスコードまたはバックアップコードを検証する（同じパスコードの再利用は拒否）
  def verify_mfa_code(code)
    return false unless mfa_enabled?

    normalized = self.class.normalize_code(code)
    if normalized.match?(/\A\d{6}\z/)
      timestamp = ROTP::TOTP.new(otp_secret).verify(normalized, drift_behind: 30, drift_ahead: 30, after: last_otp_at)
      return false unless timestamp

      update_column(:last_otp_at, timestamp)
      true
    else
      consume_backup_code(normalized)
    end
  end

  def enable_mfa!(secret)
    codes = generate_backup_codes
    update!(otp_secret: secret, otp_enabled_at: Time.current, last_otp_at: nil,
            otp_backup_codes: codes.map { |c| digest_code(c) })
    codes
  end

  def disable_mfa!
    update!(otp_secret: nil, otp_enabled_at: nil, otp_backup_codes: [], last_otp_at: nil)
  end

  def regenerate_backup_codes!
    codes = generate_backup_codes
    update!(otp_backup_codes: codes.map { |c| digest_code(c) })
    codes
  end

  def remaining_backup_codes
    Array(otp_backup_codes).size
  end

  private

  def generate_backup_codes
    Array.new(BACKUP_CODE_COUNT) { SecureRandom.alphanumeric(10).downcase.scan(/.{5}/).join("-") }
  end

  def digest_code(code)
    Digest::SHA256.hexdigest(self.class.normalize_code(code).downcase)
  end

  def consume_backup_code(code)
    digest = digest_code(code)
    match = Array(otp_backup_codes).find { |stored| ActiveSupport::SecurityUtils.secure_compare(stored, digest) }
    return false unless match

    update!(otp_backup_codes: otp_backup_codes - [ match ])
    true
  end

  def keep_at_least_one_admin
    if role_changed?(from: "admin") && User.admins.where.not(id: id).none?
      errors.add(:role, "を変更できません（管理者が 1 人もいなくなります）")
    end
  end

  def prevent_destroying_last_admin
    if role_in_database == "admin" && User.admins.where.not(id: id).none?
      errors.add(:base, "最後の管理者は削除できません")
      throw :abort
    end
  end
end
