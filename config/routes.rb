Rails.application.routes.draw do
  root "pages#index"

  # 認証
  get "login", to: "sessions#new", as: :login
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy", as: :logout
  get "login/mfa", to: "mfa_challenges#new", as: :mfa_challenge
  post "login/mfa", to: "mfa_challenges#create"

  # 初期設定・Wiki 設定（管理者）
  resource :setup, only: %i[show update], controller: "setup"
  resource :settings, only: %i[edit update]
  resources :users, except: :show do
    member do
      post :reset_mfa
    end
  end

  # 自分のアカウント
  resource :account, only: %i[show update]
  resource :password, only: %i[edit update]
  resource :mfa, only: %i[new create destroy], controller: "mfa" do
    post :backup_codes
  end

  resources :pages do
    collection do
      post :preview
    end
    resources :revisions, only: %i[index show], param: :number do
      member do
        post :restore
      end
    end
  end
  resources :folders, except: :index

  get "wiki/*title", to: "pages#wiki", as: :wiki, format: false
  get "search", to: "search#index", as: :search
  get "changes", to: "revisions#recent", as: :recent_changes
  resources :tags, only: %i[index show], constraints: { id: %r{[^/]+} }
  resources :uploads, only: %i[index create destroy]

  get "up" => "rails/health#show", as: :rails_health_check
end
