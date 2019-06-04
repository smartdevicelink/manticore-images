#!/bin/bash
#
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
# Replaces the IP address in smartDeviceLink.ini with the machine's IP address and then runs SmartDeviceLink Core.
# The IP is required to be replaced for the websocket connection with the HMI to function.

# Get the machine's IP address
DOCKER_IP="$(ip addr show ${CORE_NETWORK_INTERFACE} | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)"
echo "Changing smartDeviceLink.ini HMI ServerAddress to ${DOCKER_IP}"
echo "Running core version ${CORE_VERSION}"

# Replace the IP address in smartDeviceLink.ini with the machines IP address
perl -pi -e 's/127.0.0.1/'$DOCKER_IP'/g' /usr/build/bin/smartDeviceLink.ini

# Add the ability to send logs to stdout. Do not write logs to file
perl -pi -e 's/ALL, SmartDeviceLinkCoreLogFile/ALL, SmartDeviceLinkCoreLogFile/g' /usr/build/bin/log4cxx.properties

# Replace IP and Port in broker index.js file with the DOCKER_IP
perl -pi -e "s/localhost:8087/$DOCKER_IP:8087/g" /usr/web/broker/index.js

#Start supervisord
/usr/bin/supervisord
