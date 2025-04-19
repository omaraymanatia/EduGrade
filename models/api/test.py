import requests

response = requests.post(
    "http://localhost:8000/detect",
    json={"text": "I love my dad guys very much he is my backbone in this life and I know he have struggles in a lot of things but he is still ffighting for us"}
)
print(response.json())