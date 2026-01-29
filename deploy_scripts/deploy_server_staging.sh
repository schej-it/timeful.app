#!/bin/bash

# Run shared script
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $SCRIPT_DIR/shared_staging.sh

# Define variables
ROOT_FOLDER_SERVER_LOCATION="/schej.it-staging"

# SCP some miscellaneous gitignored files
# scp -i $AWS_KEY_LOCATION -r $SCRIPT_DIR/../server/schools/waldorf/allowed_emails.json $SERVER_HOST:~/
# ssh $SERVER_HOST -i $AWS_KEY_LOCATION "sudo mv ~/allowed_emails.json $ROOT_FOLDER_SERVER_LOCATION/server/schools/waldorf/"

# Build server locally
echo "Building server..."
cd server
GOOS="linux" GOARCH="amd64" go build -buildvcs=false

# Transfer build to server
echo "Transferring build to server..."
scp -i $AWS_KEY_LOCATION $SCRIPT_DIR/../server/server $SERVER_HOST:~/

# git pull, move server executable to the correct folder, terminate old server instance, and start new server instance
echo "Deploying server..."

ssh $SERVER_HOST -i $AWS_KEY_LOCATION " \
cd $ROOT_FOLDER_SERVER_LOCATION && \
cd server && \
sudo mv ~/server $ROOT_FOLDER_SERVER_LOCATION/server/ && \
screen -XS schej.it-staging-server quit; screen -dmS schej.it-staging-server sudo ./server -release=true"

echo "Done!"
