Mime::Type.register "text/markdown", :md

# アップロードファイルの配信にも Basic 認証を適用する
Rails.application.config.to_prepare do
  ActiveStorage::BaseController.include(BasicAuthentication)
end
