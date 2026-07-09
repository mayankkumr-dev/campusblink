with open("src/api/community.js", "r") as f:
    text = f.read()

text = text.replace("college,\n      )\n    ),", "college\n    ),")
text = text.replace("college,\n      )\n    )", "college\n    )")

with open("src/api/community.js", "w") as f:
    f.write(text)
