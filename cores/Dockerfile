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
# Basic docker build of SDL Core for use with Manticore:  https://github.com/smartdevicelink/sdl_core
# ##################################################################################################

# This image is based of debian
FROM buildpack-deps:stretch

MAINTAINER Chris Rokita version:1.0

ARG CORE_VERSION=master 
ARG DBUILD_AVAHI_SUPPORT=OFF 
ARG DBUILD_USB_SUPPORT=OFF 
ARG DBUILD_BT_SUPPORT=OFF 
ARG DEXTENDED_MEDIA_MODE=OFF 
ARG DENABLE_HMI_PTU_DECRYPTION=OFF 

ENV CORE_NETWORK_INTERFACE eth0 
ENV CORE_VERSION=${CORE_VERSION}

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \ 
        cmake \
        libudev-dev \
        libsqlite3-dev \
        libssl1.0-dev \
        nginx \
        python \
        sudo \
        supervisor \
        sqlite3 \
        git 

# Download SDL Core from github
WORKDIR /usr

RUN mkdir /usr/sdl_core
RUN git clone https://github.com/smartdevicelink/sdl_core.git /usr/sdl_core -b $CORE_VERSION --depth=1

RUN mkdir /usr/build

# Work inside the build folder
WORKDIR /usr/build

# Git needs to be configured now...
RUN git config --global user.email "anon@mail.com"
RUN git config --global user.name "Anonymous"

# Generate our Makefile, compile it and install
# Remove everything but what's inside the bin folder of the build directory to save space
RUN cmake -DBUILD_AVAHI_SUPPORT=$DBUILD_AVAHI_SUPPORT \
    -DBUILD_USB_SUPPORT=$DBUILD_USB_SUPPORT \
    -DBUILD_BT_SUPPORT=$DBUILD_BT_SUPPORT \
    -DEXTENDED_MEDIA_MODE=$DEXTENDED_MEDIA_MODE \
    -DENABLE_HMI_PTU_DECRYPTION=$DENABLE_HMI_PTU_DECRYPTION \
    ../sdl_core \
    && make \
    && make install \
    && mv bin /usr/tmpbin \
    && rm -rf * \
    && mv /usr/tmpbin bin 
    
RUN mkdir -p /usr/web/logstream 
RUN mkdir -p /usr/web/broker
RUN mkdir -p /usr/web/policy
WORKDIR /usr/web/logstream

# Copy node and npm files
COPY logstream /usr/web/logstream/
COPY broker /usr/web/broker/
COPY policy /usr/web/policy/

# Install nvm
RUN curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh -o install_nvm.sh
RUN bash install_nvm.sh
RUN /bin/bash -c "source /root/.bashrc; \
    nvm install v8.11.1 \
    nvm use v8.11.1 \
    nvm alias default v8.11.1"

# Install dependencies

WORKDIR /usr/web/logstream
RUN /bin/bash -c "source /root/.bashrc; \
    npm install"

WORKDIR /usr/web/broker
RUN /bin/bash -c "source /root/.bashrc; \
    npm install"

WORKDIR /usr/web/policy
RUN /bin/bash -c "source /root/.bashrc; \
    npm install"

# Directory to run commands in
WORKDIR /usr/build/bin

# Copy SDL Core start script into container
COPY setup.sh setup.sh

ENV LD_LIBRARY_PATH /usr/build/bin/

# Configure logger
RUN ldconfig

# Delete default nginx configuration
RUN rm -v /etc/nginx/nginx.conf

# Copy new nginx configuration
COPY nginx.conf /etc/nginx

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Replace log file with a custom made one
COPY log4cxx.properties /usr/build/bin/log4cxx.properties

# Replace hmi capabilities file with a custom made one
COPY hmi_capabilities.json /usr/build/bin/hmi_capabilities.json

# Replace sdl_preloaded_pt file with a custom made one
COPY sdl_preloaded_pt.json /usr/build/bin/sdl_preloaded_pt.json
COPY sdl_preloaded_pt.json /usr/web/policy/pt-default.json
COPY sdl_preloaded_pt.json /usr/web/policy/pt.json

# Expose the following ports
#   3001: Expose SDL Core's file system
#   12345: Expose SDL Core's primary port. Used to communicate with the SDL Core instance over TCP
#   5050: Expose video streaming port
#   5080: Expose audio streaming port
#   8090: Expose time testing port
#   8888: Expose websocket port for core log streaming
#   9000: Websocket connection to the broker
#   9898: Expose miniature policy server port
EXPOSE 3001 12345 5050 5080 8090 8888 9000 9898

# Run the start script that will launch SDL Core!
CMD ["/bin/bash", "setup.sh"]