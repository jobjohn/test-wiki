class ApplicationController < ActionController::Base
  include BasicAuthentication

  helper_method :sidebar_tree

  private

  # サイドバー用のページツリー { parent_id => [[id, title], ...] }
  def sidebar_tree
    @sidebar_tree ||= Page.order(:position, :title).pluck(:id, :title, :parent_id)
                          .group_by(&:last)
                          .transform_values { |rows| rows.map { |id, title, _| [ id, title ] } }
  end
end
