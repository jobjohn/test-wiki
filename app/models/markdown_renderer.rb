# Markdown (GitHub Flavored Markdown) を HTML に変換する。
# [[ページ名]] / [[ページ名|表示名]] 形式の Wiki リンクに対応。
class MarkdownRenderer
  WIKI_LINK = /\[\[([^\[\]|\n]+?)(?:\|([^\[\]\n]+?))?\]\]/
  # フェンスドコードブロックとインラインコードは Wiki リンク変換の対象外
  CODE = /(^(?:```|~~~)[^\n]*\n.*?^(?:```|~~~)[ \t]*$|`[^`\n]+`)/m

  OPTIONS = {
    parse: { smart: false },
    render: { hardbreaks: true, unsafe: false, github_pre_lang: true },
    extension: {
      strikethrough: true, table: true, autolink: true, tasklist: true, tagfilter: true,
      footnotes: true, header_ids: "", shortcodes: true
    }
  }.freeze

  PLUGINS = { syntax_highlighter: { theme: "InspiredGitHub" } }.freeze

  def self.render(text)
    new(text).to_html
  end

  def initialize(text)
    @text = text.to_s
  end

  def to_html
    Commonmarker.to_html(expand_wiki_links(@text), options: OPTIONS, plugins: PLUGINS).html_safe
  end

  # 本文中の Wiki リンク先ページ名
  def wiki_link_titles
    outside_code(@text).flat_map { |segment| segment.scan(WIKI_LINK).map { |title, _| title.squish } }.uniq
  end

  private

  def expand_wiki_links(text)
    titles = wiki_link_titles
    return text if titles.empty?

    existing = Page.where("lower(title) IN (?)", titles.map(&:downcase)).pluck(:title).index_by(&:downcase)
    helpers = Rails.application.routes.url_helpers

    text.split(CODE).map.with_index do |segment, i|
      next segment if i.odd? # コード部分はそのまま

      segment.gsub(WIKI_LINK) do
        title = Regexp.last_match(1).squish
        label = (Regexp.last_match(2) || Regexp.last_match(1)).strip
        path = if existing[title.downcase]
          helpers.wiki_path(title: title)
        else
          helpers.new_page_path(title: title)
        end
        "[#{escape_label(label)}](<#{path}>)"
      end
    end.join
  end

  def outside_code(text)
    text.split(CODE).each_with_index.select { |_, i| i.even? }.map(&:first)
  end

  def escape_label(label)
    label.gsub(/([\\\[\]*_`])/) { "\\#{Regexp.last_match(1)}" }
  end
end
