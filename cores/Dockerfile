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

FROM ubuntu:18.04

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
        libssl-dev \
        libssl1.1 \
        nginx \
        python3 \
        python3-pip \
        sudo \
        supervisor \
        sqlite3 \
        openssl \
        curl \
        git

# Download SDL Core from github
WORKDIR /usr

RUN mkdir /usr/sdl_core
RUN git clone https://github.com/smartdevicelink/sdl_core.git /usr/sdl_core -b $CORE_VERSION --depth=1

WORKDIR /usr/sdl_core

RUN git submodule init && git submodule update 

WORKDIR /usr

RUN mkdir /usr/build

# Work inside the build folder
WORKDIR /usr/build

# Generate our Makefile, compile it and install
# Remove everything but what's inside the bin folder of the build directory to save space
RUN cmake -DBUILD_AVAHI_SUPPORT=$DBUILD_AVAHI_SUPPORT \
    -DBUILD_USB_SUPPORT=$DBUILD_USB_SUPPORT \
    -DBUILD_BT_SUPPORT=$DBUILD_BT_SUPPORT \
    -DEXTENDED_MEDIA_MODE=$DEXTENDED_MEDIA_MODE \
    -DENABLE_HMI_PTU_DECRYPTION=$DENABLE_HMI_PTU_DECRYPTION \
    ../sdl_core \
    && make install-3rd_party \
    && make install_python_dependencies \
    && make install \
    && mv bin /usr/tmpbin \
    && rm -rf * \
    && mv /usr/tmpbin bin 
    
# Install extra libraries
RUN apt-get install -y --no-install-recommends \
    libexpat1 \
    libexpat1-dev

RUN pip3 install requests

RUN mkdir -p /usr/web/logstream 
RUN mkdir -p /usr/web/broker
RUN mkdir -p /usr/web/policy
RUN mkdir -p /usr/web/store
RUN mkdir -p /usr/web/python
WORKDIR /usr/web/logstream

# Copy node and npm files
COPY logstream /usr/web/logstream/
COPY broker /usr/web/broker/
COPY policy /usr/web/policy/
COPY store /usr/web/store/

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

RUN echo 'export NVM_DIR="$HOME/.nvm"'                                       >> "$HOME/.bashrc"
RUN echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm' >> "$HOME/.bashrc"
RUN echo '[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion" # This loads nvm bash_completion' >> "$HOME/.bashrc"

# snippet from https://github.com/nvm-sh/nvm/blob/master/Dockerfile
RUN bash -c 'source $HOME/.nvm/nvm.sh   && \
    nvm install v8.11.1 \
    nvm use v8.11.1 \
    nvm alias default v8.11.1'

# Install dependencies

WORKDIR /usr/web/logstream
RUN bash -c "source $HOME/.nvm/nvm.sh   && \
    npm install"

WORKDIR /usr/web/broker
RUN bash -c "source $HOME/.nvm/nvm.sh   && \
    npm install"

WORKDIR /usr/web/policy
RUN bash -c "source $HOME/.nvm/nvm.sh   && \
    npm install"

WORKDIR /usr/web/store
RUN bash -c "source $HOME/.nvm/nvm.sh   && \
    npm install"

# Grab specifically the python server contents from the generic HMI repository
RUN git clone https://github.com/smartdevicelink/generic_hmi.git /usr/web/python -b master --depth=1 --recurse-submodules
COPY start_server.py /usr/web/python/tools/start_server.py

# Extra imports needed for the python server
RUN apt-get install ffmpeg -y --no-install-recommends
RUN pip3 install --upgrade pip
RUN pip3 install ffmpeg-python pexpect pyopenssl

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
#   2020: Expose websocket server
#   3000: Expose app store server
#   8081: Expose HMI python server
EXPOSE 3001 12345 5050 5080 8090 8888 9000 9898 2020 3000 8081

# Run the start script that will launch SDL Core!
CMD ["/bin/bash", "setup.sh"]