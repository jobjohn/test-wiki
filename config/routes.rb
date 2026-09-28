Rails.application.routes.draw do
  root "pages#index"

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

  get "wiki/*title", to: "pages#wiki", as: :wiki, format: false
  get "search", to: "search#index", as: :search
  get "changes", to: "revisions#recent", as: :recent_changes
  resources :tags, only: %i[index show], constraints: { id: %r{[^/]+} }
  resources :uploads, only: %i[index create destroy]

  get "up" => "rails/health#show", as: :rails_health_check
end
