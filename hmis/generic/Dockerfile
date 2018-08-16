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

# ##################################################################################################
# Basic docker build of Generic HMI for use with Manticore:  https://github.com/smartdevicelink/generic_hmi
# ##################################################################################################

# This image has node and npm preinstalled
FROM node:7.10.0-slim

MAINTAINER Chris Rokita version:1.0

ARG HMI_VERSION=minimal 
ENV CORE_FILE_ADDR 127.0.0.1:3001
ENV BROKER_ADDR ws:\/\/127.0.0.1:9000

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    nginx 

# Download Generic HMI from github 

RUN mkdir -p /usr/app/webapp
RUN git clone https://github.com/smartdevicelink/generic_hmi.git /usr/app/webapp -b $HMI_VERSION --depth=1

WORKDIR /usr/app/webapp

# Install dependencies and run webpack so we can guarantee the bundle.js file exists
# Remove everything but the build/bundle.js file and the index.html file 
RUN npm install \
	&& npm rebuild node-sass \
	&& ./node_modules/webpack/bin/webpack.js \
	&& mv build /usr/app/tmpbuild \
	&& mv index.html /usr/app/tmpindex.html \
	&& mv fonts /usr/app/tmpfonts \
	&& rm -rf * \
	&& mv /usr/app/tmpbuild build \
	&& mv /usr/app/tmpindex.html index.html \
	&& mv /usr/app/tmpfonts fonts 

# Copy SDL Core start script into container
COPY setup.sh setup.sh

# Delete default nginx configuration
RUN rm -v /etc/nginx/nginx.conf

# Copy our new configuration
COPY nginx.conf /etc/nginx/

# Configure logger
RUN ldconfig

# Expose the following ports
#   8080:  Returns index.html of HMI
EXPOSE 8080

# Run nginx
CMD ["/bin/bash", "setup.sh"]
