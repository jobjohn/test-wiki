# 環境変数 WIKI_PASSWORD（と任意で WIKI_USERNAME）を設定すると Basic 認証を有効にする
module BasicAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :require_basic_authentication, if: -> { BasicAuthentication.enabled? }
  end

  def self.enabled?
    ENV["WIKI_PASSWORD"].present?
  end

  private

  def require_basic_authentication
    authenticate_or_request_with_http_basic("Wiki") do |name, password|
      expected_name = ENV.fetch("WIKI_USERNAME", "admin")
      ActiveSupport::SecurityUtils.secure_compare(name, expected_name) &
        ActiveSupport::SecurityUtils.secure_compare(password, ENV["WIKI_PASSWORD"])
    end
  end
end
