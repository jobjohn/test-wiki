# Lucide アイコン（https://lucide.dev, ISC License）をインライン SVG で描画する。
# アイコンは vendor/lucide/*.svg に同梱。
module IconHelper
  ICON_DIR = Rails.root.join("vendor/lucide")
  ICON_CACHE = Concurrent::Map.new

  def icon(name, size: 18, **attrs)
    css_class = attrs.delete(:class)
    tag.svg(IconHelper.icon_body(name),
            xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24",
            fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round",
            "stroke-linejoin": "round", class: [ "icon", "icon-#{name}", css_class ],
            "aria-hidden": "true", **attrs)
  end

  # アイコン + テキスト
  def icon_label(name, text, **options)
    safe_join([ icon(name, **options), tag.span(text) ])
  end

  def self.icon_body(name)
    raise ArgumentError, "invalid icon name: #{name}" unless name.to_s.match?(/\A[a-z0-9-]+\z/)

    loader = -> { File.read(ICON_DIR.join("#{name}.svg")).html_safe }
    Rails.env.development? ? loader.call : ICON_CACHE.compute_if_absent(name.to_s) { loader.call }
  end
end
