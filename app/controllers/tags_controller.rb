class TagsController < ApplicationController
  def index
    @tags = Tag.with_counts
  end

  def show
    @tag = Tag.where("lower(name) = ?", params[:id].to_s.downcase).first!
    @pages = @tag.pages.includes(:tags).order(:title)
  end
end
