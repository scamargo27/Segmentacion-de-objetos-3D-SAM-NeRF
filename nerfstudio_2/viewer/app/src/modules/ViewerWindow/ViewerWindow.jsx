import * as THREE from 'three';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { SelectChangeEvent } from '@mui/material/Select';
import { useDispatch, useSelector } from 'react-redux';

import { IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import PublicOffSharpIcon from '@mui/icons-material/PublicOffSharp';
import PublicSharpIcon from '@mui/icons-material/PublicSharp';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBackOutlined';
import { isEqual } from 'lodash';
import RenderWindow from '../RenderWindow/RenderWindow';
import {
  makeThrottledMessageSender,
  ViserWebSocketContext,
} from '../WebSocket/ViserWebSocket';
import store from '../../store';
import { element } from 'prop-types';
import { RestaurantMenu } from '@mui/icons-material';

function CameraToggle() {
  const dispatch = useDispatch();
  const camera_choice = useSelector(
    (state) => state.renderingState.camera_choice,
  );
  const set_camera_choice = (event: SelectChangeEvent, value: string[]) => {
    if (value != null) {
      dispatch({
        type: 'write',
        path: 'renderingState/camera_choice',
        data: value,
      });
    }
  };

  return (
    <ToggleButtonGroup
      value={camera_choice}
      exclusive
      onChange={set_camera_choice}
      aria-label="camera view"
      size="small"
    >
      <ToggleButton value="Main Camera" disableRipple sx={{ width: '160px' }}>
        <ThreeDRotationIcon fontSize="small" sx={{ mr: 1, ml: -0.5 }} />
        Viewport
      </ToggleButton>
      <ToggleButton value="Render Camera" disableRipple sx={{ width: '160px' }}>
        <VideoCameraBackIcon
          value="Render Camera"
          fontSize="small"
          sx={{ mr: 1, ml: 0.5 }}
        />
        Render View
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

function TransformIcons(props) {
  const sceneTree = props.sceneTree;
  const transform_controls = sceneTree.find_object(['Transform Controls']);
  // NOTE(ethan): I'm not sure why this is necessary, but it is
  // toggle back and forth between local and global transform
  const [world, setWorld] = React.useState(true);

  const toggleLocal = () => {
    transform_controls.setSpace(world ? 'local' : 'world');
    setWorld(!world);
  };

  return (
    <div>
      <div className="ViewerWindow-iconbutton">
        <IconButton
          size="large"
          onClick={() => {
            transform_controls.setMode('translate');
          }}
        >
          {/* translate */}
          <OpenWithIcon />
        </IconButton>
      </div>
      <div className="ViewerWindow-iconbutton">
        <IconButton
          size="large"
          onClick={() => {
            transform_controls.setMode('rotate');
          }}
        >
          {/* rotate */}
          <SyncOutlinedIcon />
        </IconButton>
      </div>
      <div className="ViewerWindow-iconbutton">
        <IconButton size="large" onClick={toggleLocal}>
          {world ? <PublicSharpIcon /> : <PublicOffSharpIcon />}
        </IconButton>
      </div>
    </div>
  );
}

// manages a camera
export default function ViewerWindow(props) {
  const sceneTree = props.sceneTree;
  const scene = sceneTree.object;
  const renderer = sceneTree.metadata.renderer;
  const labelRenderer = sceneTree.metadata.labelRenderer;

  const myRef = useRef(null);
  const dispatch = useDispatch();
  const viser_websocket = useContext(ViserWebSocketContext);
  const field_of_view = useSelector(
    (state) => state.renderingState.field_of_view,
  );

  const camera_choice = useSelector(
    (state) => state.renderingState.camera_choice,
  );
  const camera_type = useSelector((state) => state.renderingState.camera_type);

  const xs = useSelector((state) => state.renderingState.xs);
  const ys = useSelector((state) => state.renderingState.ys);
  const sam_points_changed = useSelector((state) => state.renderingState.sam_points_changed);

  // const search_text = useSelector((state) => state.renderingState.search_text);

  const [searchText, setSearchText] = useState('a table');

  function handleInputChange(event) {
    setSearchText(event.target.value);
  }

  const sendSearchTextMessage = makeThrottledMessageSender(
    viser_websocket,
    25,
  );

  function handleInputChange(event) {
  }

  function handleKeyDown(event) {
    // TODO:
    // when key is "ctrl + F", toggle display and switch the output render option
    // when key is "enter", send search text to backend
    // if (event.ctrlKey && event.key == 'f') {
    //   if (event.target.style.display === 'none') {
    //     event.target.style.display = 'block';
    //   } else {
    //     event.target.style.display = 'none';
    //   }
    // }
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      element.style.display = 'none';
      sendSearchTextMessage({
        type: 'SearchTextMessage',
        text: '',
        switch_to_heat_map: false,
      });
      return;
    }
    if (event.key.length === 1) {
      let newText = event.target.value + event.key;
      setSearchText(newText);
      return;
    }
    if (event.keyCode === 8) {
      event.preventDefault();
      const element = event.target;
      const selectionStart = element.selectionStart;
      const selectionEnd = element.selectionEnd;
      const value = element.value;
      const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionEnd);
      element.value = newValue;
      element.selectionStart = selectionStart - 1;
      element.selectionEnd = selectionStart - 1;
      setSearchText(newText);
    }
    if (event.key === 'Enter') {
      // dispatch({
      //   type: 'write',
      //   path: 'renderingState/search_text',
      //   data: event.target.value,
      // });
      // and send message to backend
      sendSearchTextMessage({
        type: 'SearchTextMessage',
        text: event.target.value,
        switch_to_heat_map: true,
      });
    }
  }

  // listen to the viewport width
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const [viewport_size, setDimensions] = React.useState({
    height: size.x,
    width: size.y,
  });
  const viewport_width = viewport_size.width;
  const viewport_height = viewport_size.height;

  // on change, update the camera and controls
  sceneTree.metadata.camera = sceneTree.find_object(['Cameras', camera_choice]);

  const get_window_width = () => {
    const width = myRef.current.clientWidth;
    return width - (width % 2);
  };

  const get_window_height = () => {
    return myRef.current.clientHeight;
  };

  const handleResize = () => {
    const viewportWidth = get_window_width();
    const viewportHeight = get_window_height();
    sceneTree.metadata.camera.aspect = viewportWidth / viewportHeight;
    sceneTree.metadata.camera.updateProjectionMatrix();
    renderer.setSize(viewportWidth, viewportHeight);
    labelRenderer.setSize(viewportWidth, viewportHeight);
  };

  const render = () => {
    const fps = 24;
    const interval = 1000 / fps;
    handleResize();
    sceneTree.metadata.camera.updateProjectionMatrix();
    sceneTree.metadata.moveCamera();
    sceneTree.metadata.camera_controls.update(interval);
    requestAnimationFrame(render);
    renderer.render(scene, sceneTree.metadata.camera);
    labelRenderer.render(scene, sceneTree.metadata.camera);
  };

  useEffect(() => {
    const handleNewDimensions = () => {
      setDimensions({
        height: get_window_height(),
        width: get_window_width(),
      });
    };

    setDimensions({
      height: get_window_height(),
      width: get_window_width(),
    });
    render();

    window.addEventListener('resize', handleNewDimensions);
    return () => {
      window.removeEventListener('resize', handleNewDimensions);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start the three.js rendering loop
  // when the DOM is ready
  useEffect(() => {
    myRef.current.append(renderer.domElement);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const render_height = useSelector(
    (state) => state.renderingState.render_height,
  );
  const render_width = useSelector(
    (state) => state.renderingState.render_width,
  );

  let crop_w;
  let crop_h;
  const render_aspect = render_width / render_height;
  const viewport_aspect = viewport_width / viewport_height;
  let render_viewport_apsect_ratio = null;
  if (render_aspect > viewport_aspect) {
    // render width is the limiting factor
    crop_w = viewport_width;
    crop_h = viewport_width / render_aspect;
    render_viewport_apsect_ratio = viewport_aspect / render_aspect;
  } else {
    // render height is the limiting factor
    crop_w = viewport_height * render_aspect;
    crop_h = viewport_height;
    render_viewport_apsect_ratio = 1.0;
  }

  let display = null;
  if (camera_choice === 'Main Camera') {
    display = 'none';
  } else {
    display = 'flex';
  }

  const crop_style = {
    display,
    width: crop_w,
    height: crop_h,
  };

  // set the threejs field of view
  // such that the rendered video will match correctly
  if (camera_choice !== 'Main Camera') {
    const fl = 1.0 / Math.tan((field_of_view * Math.PI) / 360);
    const fl_new = fl * render_viewport_apsect_ratio;
    const fov = Math.atan(1 / fl_new) / (Math.PI / 360);
    sceneTree.metadata.camera.fov = fov;
  } else {
    sceneTree.metadata.camera.fov = 50;
  }

  let old_camera_matrix = null;
  let is_moving = false;
  const sendThrottledCameraMessage = makeThrottledMessageSender(
    viser_websocket,
    25,
  );
  // update the camera information in the python server
  const sendCamera = () => {
    if (isEqual(old_camera_matrix, sceneTree.metadata.camera.matrix.elements)) {
      if (is_moving) {
        is_moving = false;
      } else {
        if (sam_points_changed) {
          dispatch({
            type: 'write',
            path: 'renderingState/sam_points_changed',
            value: false,
          });
        }
        else {
          return;
        }
      }
    } else {
      is_moving = true;
    }
    // console.log(xs.length);
    old_camera_matrix = sceneTree.metadata.camera.matrix.elements.slice();
    sendThrottledCameraMessage({
      type: 'CameraMessage',
      aspect: sceneTree.metadata.camera.aspect,
      render_aspect,
      fov: sceneTree.metadata.camera.fov,
      matrix: old_camera_matrix,
      camera_type,
      is_moving,
      timestamp: +new Date(),
      xs: xs,
      ys: ys,
    });
  };

  // keep sending the camera often
  // rerun this when the websocket changes
  useEffect(() => {
    const fps = 24;
    const interval = 1000 / fps;
    const refreshIntervalId = setInterval(sendCamera, interval);
    return () => {
      clearInterval(refreshIntervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viser_websocket, camera_choice, camera_type, render_aspect, xs, ys, sam_points_changed]);

  const isWebsocketConnected = useSelector(
    (state) => state.websocketState.isConnected,
  );
  useEffect(() => {
    if (isWebsocketConnected) {
      sendThrottledCameraMessage({
        type: 'CameraMessage',
        aspect: sceneTree.metadata.camera.aspect,
        render_aspect,
        fov: sceneTree.metadata.camera.fov,
        matrix: sceneTree.metadata.camera.matrix.elements.slice(),
        camera_type,
        is_moving: false,
        timestamp: +new Date(),
        xs: xs,
        ys: ys,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebsocketConnected]);

  return (
    <>
      <RenderWindow />
      <div className="canvas-container-main" ref={myRef}>
        {/* <div className="ViewerWindow-camera-toggle">
          <CameraToggle />
        </div> */}
        <div>
          <input className="search-input fade-in" id="search-input" type="text" placeholder='Search' value={searchText} onKeyDown={handleKeyDown} style={{ display: 'none' }} />
          {/* <div class="td" id="s-cover">
            <button type="submit" id="ss-button">
              <div id="s-circle"></div>
              <span></span>
            </button>
          </div> */}
        </div>
      </div>
      <div className="ViewerWindow-buttons" style={{ display: 'none' }}>
        <TransformIcons sceneTree={sceneTree} />
      </div>
      <div className="ViewerWindow-render-crop-container">
        <div className="ViewerWindow-render-crop" style={crop_style} />
      </div>
    </>
  );
}
