Mime::Type.register "text/markdown", :md

# MFA シークレットの暗号化キーを secret_key_base から導出する（別途キーの管理は不要）
Rails.application.config.after_initialize do
  unless ENV["SECRET_KEY_BASE_DUMMY"]
    key_generator = Rails.application.key_generator
    ActiveRecord::Encryption.configure(
      primary_key: key_generator.generate_key("wiki/active_record_encryption/primary_key", 32).unpack1("H*"),
      deterministic_key: key_generator.generate_key("wiki/active_record_encryption/deterministic_key", 32).unpack1("H*"),
      key_derivation_salt: key_generator.generate_key("wiki/active_record_encryption/key_derivation_salt", 32).unpack1("H*")
    )
  end
end

# アップロードファイルの配信にもログイン要否の判定を適用する
Rails.application.config.to_prepare do
  ActiveStorage::BaseController.include(Authentication)
end
