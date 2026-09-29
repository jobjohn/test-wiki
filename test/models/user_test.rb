require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "creates the default admin only when there are no users" do
    User.ensure_default_admin!
    admin = User.find_by_username("WikiAdmin")
    assert admin.admin?
    assert admin.must_change_password?
    assert admin.authenticate("wikiadmin")

    assert_no_difference -> { User.count } do
      User.ensure_default_admin!
    end
  end

  test "validates username and password" do
    assert_not User.new(username: "ab", password: "password123").valid?
    assert_not User.new(username: "valid_name", password: "short").valid?
    assert User.new(username: "valid_name", password: "password123").valid?
  end

  test "keeps at least one admin" do
    admin = User.create!(username: "admin1", password: "password123", role: "admin")
    assert_not admin.update(role: "editor")
    assert_not admin.destroy

    User.create!(username: "admin2", password: "password123", role: "admin")
    assert admin.update(role: "editor")
  end

  test "mfa with totp passcodes and single-use backup codes" do
    user = User.create!(username: "mfauser", password: "password123")
    secret = User.generate_otp_secret
    codes = user.enable_mfa!(secret)

    assert user.mfa_enabled?
    assert_equal 10, codes.size
    assert_not user.verify_mfa_code("000000") if ROTP::TOTP.new(secret).now != "000000"

    code = ROTP::TOTP.new(secret).now
    assert user.verify_mfa_code(code)
    assert_not user.verify_mfa_code(code), "same passcode must not be reusable"

    assert user.verify_mfa_code(codes.first.upcase)
    assert_not user.verify_mfa_code(codes.first)
    assert_equal 9, user.remaining_backup_codes

    assert_not_equal secret, User.connection.select_value("SELECT otp_secret FROM users WHERE id = #{user.id}")
  end

  test "session token changes with password" do
    user = User.create!(username: "tokenuser", password: "password123")
    token = user.session_token
    user.update!(password: "another-password")
    assert_not_equal token, user.session_token
  end
end
