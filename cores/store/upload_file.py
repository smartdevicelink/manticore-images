import requests
with open('demo.zip', 'rb') as f:
    r = requests.post('http://localhost:3000/applications/appID', files={'something.zip': f})
    print r.status_code
    print r.text