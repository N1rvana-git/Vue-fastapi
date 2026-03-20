import codecs

with codecs.open('d:/PycharmProjects/my-frontend/src/main.js', 'r', 'utf-8') as f:
    text = f.read()

text = text.replace("\\'access_token\\'", "'access_token'")
text = text.replace("\\'登录状态已过期，请重新登录\\'", "'登录状态已过期，请重新登录'")
text = text.replace("\\'/login\\'", "'/login'")

with codecs.open('d:/PycharmProjects/my-frontend/src/main.js', 'w', 'utf-8') as f:
    f.write(text)

print("done")
