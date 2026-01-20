#!/bin/bash

# shared.sh contains the scripting stuff that is shared between the deploy script for frontend and backend
# Such shared stuff includes: checking the arguments are correct and that current branch is set correctly

# Check arguments
if [ $# -ne 2 ]
then
  SCRIPT_NAME="$( grep -o '\/[^\/]*$' <<< $0 )"
  echo "ERROR: Incorrect number of arguments! USAGE: .$SCRIPT_NAME SERVER_HOST AWS_KEY_LOCATION"
  exit 1
fi

SERVER_HOST="$1"
AWS_KEY_LOCATION="$( pwd )/$2"
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DEPLOY_BRANCH="staging" # The branch to deploy

# Check if aws key file exists
if test ! -f "$AWS_KEY_LOCATION"
then
  echo "ERROR: File \"$AWS_KEY_LOCATION\" does not exist!"
  exit 1
fi

# Check if on correct branch
cd $SCRIPT_DIR/../
CUR_BRANCH="$( git rev-parse --abbrev-ref HEAD )"
if [ "$CUR_BRANCH" != "$DEPLOY_BRANCH" ]
then
  echo "ERROR: Current branch is not \"$DEPLOY_BRANCH\". Please switch the current branch to \"$DEPLOY_BRANCH\" before deploying."
  exit 1
fi