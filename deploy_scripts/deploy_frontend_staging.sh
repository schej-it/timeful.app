#!/bin/bash

# Run shared script
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $SCRIPT_DIR/shared_staging.sh

# Define variables
DIST_FOLDER_SERVER_LOCATION="/schej.it-staging/frontend/dist" # The location of the dist folder on the server

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build

# Delete old build 
echo -n "Deleting old dist folder..."
ssh $SERVER_HOST -i $AWS_KEY_LOCATION "sudo rm -rf $DIST_FOLDER_SERVER_LOCATION"
echo "Done!"

# Transfer build to server
echo "Transferring build to server..."
scp -i $AWS_KEY_LOCATION -r $SCRIPT_DIR/../frontend/dist $SERVER_HOST:~/
ssh $SERVER_HOST -i $AWS_KEY_LOCATION "sudo mv ~/dist $DIST_FOLDER_SERVER_LOCATION"

echo "Done!"