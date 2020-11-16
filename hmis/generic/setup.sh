#!/bin/bash
# Copyright (c) 2018 Livio, Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.
#
# Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following
# disclaimer in the documentation and/or other materials provided with the
# distribution.
#
# Neither the name of the Livio Inc. nor the names of its contributors
# may be used to endorse or promote products derived from this software
# without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#

echo "Changing Controller.js Broker ServerAddress to ${BROKER_ADDR}"
echo "Changing Nginx file proxy address to ${CORE_FILE_ADDR}"
echo "Changing Python server address to ${PYTHON_ADDRESS}"

BROKER_PROTOCOL=$(echo ${BROKER_ADDR} | cut -d: -f1)
BROKER_NO_PROTOCOL=$(echo ${BROKER_ADDR} | cut -d/ -f3)
BROKER_HOST=$(echo ${BROKER_NO_PROTOCOL} | cut -d: -f1)
BROKER_PORT=$(echo ${BROKER_NO_PROTOCOL} | cut -d: -f2)

# perl -pi -e "s/PTUWithModemEnabled : false/PTUWithModemEnabled : true/g" /usr/app/webapp/build/Flags.js

# Replace IP and Port in Controller file with the address to the broker.
# The address for the broker is REQUIRED to include the protocol (ex. ws://localhost:80)
perl -pi -e "s/CoreHost: '127.0.0.1'/CoreHost: '$BROKER_HOST'/g" /usr/app/webapp/build/Flags.js
perl -pi -e "s/CorePort: 8087/CorePort: $BROKER_PORT/g" /usr/app/webapp/build/Flags.js
perl -pi -e "s/CoreProtocol: 'ws'/CoreProtocol: '$BROKER_PROTOCOL'/g" /usr/app/webapp/build/Flags.js
# Change to the correct python websocket server address
perl -pi -e "s/ws:\/\/127.0.0.1:8081/${PYTHON_ADDRESS}/g" /usr/app/webapp/build/Flags.js
# Replace XXXXX in the nginx conf file with the address of sdl_core
perl -pi -e "s/XXXXX/$CORE_FILE_ADDR/g" /etc/nginx/nginx.conf
#Start nginx
/usr/sbin/nginx
