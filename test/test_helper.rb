ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    parallelize(workers: 1)
  end
end

module SignInHelper
  def complete_setup!(**attrs)
    Setting.current.update!(setup_completed_at: Time.current, **attrs)
  end

  def create_user(username = "editor1", role: "editor", password: "password123", **attrs)
    User.create!(username: username, role: role, password: password, **attrs)
  end

  def sign_in_as(user, password: "password123")
    post login_path, params: { username: user.username, password: password }
  end
end

class ActionDispatch::IntegrationTest
  include SignInHelper
end
