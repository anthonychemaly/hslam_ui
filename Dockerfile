# Stage 1: Base image with Ubuntu 20.04 and ROS Noetic
FROM osrf/ros:noetic-desktop-full-focal AS base
ARG DEBIAN_FRONTEND=noninteractive

# Install catkin tools dependencies
RUN apt-get update && apt-get install -y \
    python3-catkin-tools \
    python3-osrf-pycommon

# Stage 2: Additional dependencies and Realsense SDK
# Install Camera Realsense D435 dependencies
RUN apt-get update && apt-get install -y ros-noetic-usb-cam
# Install system wide dependencies
RUN apt-get install -y \
    libgl1-mesa-dev \
    libglew-dev \
    libsuitesparse-dev \
    libeigen3-dev \
    libboost-all-dev \
    cmake \
    build-essential \
    git \
    libzip-dev \
    ccache \
    freeglut3-dev \
    libgoogle-glog-dev \
    libatlas-base-dev \
    ninja-build
# Install pangolin gui dependencies (optional)
RUN apt-get install -y \
    ffmpeg \
    libavcodec-dev \
    libavutil-dev \
    libavformat-dev \
    libswscale-dev \
    libavdevice-dev
# Install additional libraries
RUN apt-get install -y \
    libjpeg8-dev \
    libpng-dev \
    libtiff5-dev \
    libtiff-dev \
    libavcodec-dev \
    libavformat-dev \
    libv4l-dev \
    libgtk2.0-dev \
    qtbase5-dev \
    qtchooser \
    qt5-qmake \
    qtbase5-dev-tools\
    v4l-utils\
    wget \
    unzip \
    x11-apps \
    dbus-x11

# Set the working directory
WORKDIR /catkin_ws/src/FSLAM/Thirdparty
# Copy Thirdparty folder to the container
COPY Thirdparty /catkin_ws/src/FSLAM/Thirdparty
# Download additional thirdparty libraries
ARG cvVersion=3.4.6
ARG DL_opencv="https://github.com/opencv/opencv/archive/${cvVersion}.zip"
ARG DL_contrib="https://github.com/opencv/opencv_contrib/archive/${cvVersion}.zip"
RUN wget ceres-solver.org/ceres-solver-1.14.0.tar.gz \
    && tar -zxf ceres-solver-1.14.0.tar.gz \
    && wget -O opencv.zip -nc "${DL_opencv}" \
    && unzip opencv.zip \
    && rm opencv.zip \
    && cd opencv-3.4.6 \
    && wget -O opencv_contrib.zip -nc "${DL_contrib}" \
    && unzip opencv_contrib.zip \
    && rm opencv_contrib.zip
# Build Thirdparty libraries using script(cmake)
RUN chmod +x build.sh && ./build.sh
# Copy project files
WORKDIR /catkin_ws/src/FSLAM
COPY FSLAM /catkin_ws/src/FSLAM
# Build FSLAM project using cmake
RUN mkdir -p build && cd build && cmake .. -DCMAKE_BUILD_TYPE=RelwithDebInfo && make -j 10
# Copy fslam_ros wrapper and build using catkin
COPY fslam_ros /catkin_ws/src/fslam_ros
WORKDIR /catkin_ws/
RUN catkin init \
    && catkin config \
    -DCMAKE_BUILD_TYPE=Release \
    --extend /opt/ros/$ROS_DISTRO \
    && catkin build fslam_ros

# Source catkin and specify the entry point of the container
RUN sed --in-place --expression \
      '$isource "/catkin_ws/devel/setup.bash"' \
      /ros_entrypoint.sh
# Copy calibration files
WORKDIR /catkin_ws/src/FSLAM
COPY res /catkin_ws/src/res
WORKDIR /catkin_ws

# Stage 3: Install Node.js and Electron UI
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set the working directory for the UI
WORKDIR /catkin_ws/ui
# Clone the Electron UI repository
RUN git clone https://github.com/anthonychemaly/hslam_ui.git .
# Install dependencies
RUN rm -rf node_modules package-lock.json && npm install && npm install @rollup/rollup-linux-x64-gnu

# Build the Electron app
RUN npm run build:linux

# Install the generated .deb package
RUN dpkg -i /catkin_ws/ui/dist/hslam_ui_1.0.0_amd64.deb || apt-get install -f -y

# Set the entry point to run the Electron app
WORKDIR /
CMD ["hslam_ui", "--no-sandbox"]
