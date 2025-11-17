require 'base64'

puts Base64.strict_encode64(File.read(ARGV[0]))