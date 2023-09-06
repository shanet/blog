# This is used to render data strings with markdown in them
module Jekyll
  module MarkdownFilter
    def markdown(string)
      Kramdown::Document.new(string).to_html
    end
  end
end

Liquid::Template.register_filter(Jekyll::MarkdownFilter)
