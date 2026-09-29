require "test_helper"

class AuthFlowTest < ActionDispatch::IntegrationTest
  test "first run: wikiadmin logs in, completes setup and changes password" do
    get root_path
    assert_redirected_to login_path

    get login_path
    assert_select ".notice-box code", "wikiadmin"

    post login_path, params: { username: "wikiadmin", password: "wikiadmin" }
    follow_redirect!
    assert_redirected_to setup_path
    follow_redirect!
    assert_select "input[name='setting[wiki_name]']"

    patch setup_path, params: { setting: { wiki_name: "開発チーム Wiki", description: "手順書をまとめる", theme: "grape" },
                                password: "wikiadmin", password_confirmation: "wikiadmin" }
    assert_response :unprocessable_entity

    patch setup_path, params: { setting: { wiki_name: "開発チーム Wiki", description: "手順書をまとめる", theme: "grape" },
                                password: "new-password-1", password_confirmation: "new-password-1" }
    assert_redirected_to root_path
    follow_redirect!
    assert_select ".hero h1", "開発チーム Wiki"
    assert_select "style#theme-variables", /#7c3aed/

    setting = Setting.current
    assert setting.setup_completed?
    assert_not User.find_by_username("wikiadmin").must_change_password?

    get setup_path
    assert_redirected_to edit_settings_path
  end

  test "wrong password is rejected" do
    User.ensure_default_admin!
    post login_path, params: { username: "wikiadmin", password: "nope" }
    assert_response :unprocessable_entity
    get root_path
    assert_redirected_to login_path
  end

  test "public read allows anonymous viewing but not editing" do
    Setting.current.update!(setup_completed_at: Time.current, public_read: true)
    page = Page.create!(title: "Public")

    get page_path(page)
    assert_response :success
    get new_page_path
    assert_redirected_to login_path
    post preview_pages_path, params: { body: "x" }
    assert_redirected_to login_path
  end

  test "mfa enrollment and login with passcode" do
    Setting.current.update!(setup_completed_at: Time.current)
    user = User.create!(username: "alice", password: "password123")
    sign_in_as(user)

    get new_mfa_path
    assert_select ".qr svg"
    secret = session[:pending_otp_secret]

    post mfa_path, params: { code: "000000" } if ROTP::TOTP.new(secret).now != "000000"
    post mfa_path, params: { code: ROTP::TOTP.new(secret).now }
    assert_select ".backup-codes code", 10
    assert user.reload.mfa_enabled?

    delete logout_path
    post login_path, params: { username: "alice", password: "password123" }
    assert_redirected_to mfa_challenge_path
    get root_path
    assert_redirected_to login_path, "must not be signed in before passcode"

    post login_path, params: { username: "alice", password: "password123" }
    post mfa_challenge_path, params: { code: "12" }
    assert_response :unprocessable_entity

    travel 31.seconds do
      post mfa_challenge_path, params: { code: ROTP::TOTP.new(secret).now }
      assert_redirected_to root_path
    end
  end

  test "require_mfa setting forces enrollment" do
    Setting.current.update!(setup_completed_at: Time.current, require_mfa: true)
    user = User.create!(username: "bob", password: "password123")
    sign_in_as(user)
    get root_path
    assert_redirected_to new_mfa_path
  end

  test "changing password signs out other sessions" do
    Setting.current.update!(setup_completed_at: Time.current)
    user = User.create!(username: "carol", password: "password123")
    sign_in_as(user)
    patch password_path, params: { current_password: "password123", password: "changed-pass", password_confirmation: "changed-pass" }
    assert_redirected_to account_path
    get account_path
    assert_response :success

    other = open_session
    other.post login_path, params: { username: "carol", password: "password123" }
    assert_equal 422, other.response.status
  end

  test "admin manages users and settings" do
    Setting.current.update!(setup_completed_at: Time.current)
    admin = User.create!(username: "root1", password: "password123", role: "admin")
    sign_in_as(admin)

    post users_path, params: { user: { username: "dave", role: "viewer", password: "password123", password_confirmation: "password123" } }
    assert_redirected_to users_path
    assert User.find_by_username("dave")

    patch settings_path, params: { setting: { wiki_name: "新しい名前", theme: "custom", primary_color: "#112233",
                                              secondary_color: "#445566", accent_color: "#778899", color_mode: "dark" } }
    assert_redirected_to edit_settings_path
    assert_equal [ "#112233", "#445566", "#778899" ], Setting.current.colors
    follow_redirect!
    assert_select "html[data-theme=dark]"

    delete logout_path
    sign_in_as(User.find_by_username("dave"))
    get edit_settings_path
    assert_redirected_to root_path
  end
end
