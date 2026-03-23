import re

with open(r'd:\PycharmProjects\my-frontend\src\views\Login.vue', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('还没账号？ <a href="#" class="link">立即注册</a>', '还没账号？ <a href="#" @click.prevent="router.push(\'/register\')" class="link">立即注册</a>')

with open(r'd:\PycharmProjects\my-frontend\src\views\Login.vue', 'w', encoding='utf-8') as f:
    f.write(content)
