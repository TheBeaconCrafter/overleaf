Overleaf does not support ARM architecture, so this needs to be built either on linux or using WSL2 on Windows.

sudo make build-base && sudo make build-community && sudo docker compose build && sudo docker compose up