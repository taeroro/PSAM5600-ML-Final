import React, { useState, useEffect, useRef } from 'react';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

import Overlay from './Overlay';
import positions from './image_umap_position_neighbors';
import './App.css';


function App() {
  const [overlay, setOverlay] = useState(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(0);
  const canvas = useRef(null);

  let loadingNum = 0;

  useEffect(() => {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      view: canvas.current,
      antialias: true
    });

    let positionDict = {}

    for (let i = 0; i < positions.length; i++) {
      const filename = positions[i].filename.replace('resized_faces_gray/', '');
      const name = filename.replace('.jpg', '');

      app.loader.add(name, "./resized_faces_gray/" + filename);

      positionDict[name] = positions[i];
    }

    const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: 500,
        worldHeight: 500,
        interaction: app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
    })

    window.addEventListener('resize', resize);

    function resize() {
      viewport.resize(window.innerWidth, window.innerHeight, 500, 500);
      app.view.width = window.innerWidth;
      app.view.height = window.innerHeight;
    }

    // let clicked = 0;
    // window.addEventListener('click', clickOutSide);
    // function clickOutSide() {
    //   console.log(overlay);
    //   if (overlay === null) {
    //     console.log("here");
    //     viewport.plugins.resume('wheel');
    //   }
    //   if (clicked > 1) {
    //     viewport.plugins.resume('wheel');
    //     console.log("listener " + clicked);
    //     clicked = 0;
    //   }
    //
    //   if (clicked !== 0) clicked++;
    // }

    // add the viewport to the stage
    app.stage.addChild(viewport);

    // activate plugins
    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()

    viewport.setZoom(.02, true);
    // viewport.moveCenter(2000, 0);
    viewport.sortableChildren = true;

    let sprites = [];
    let index = 0;

    // drag axis
    // let graphics = new PIXI.Graphics();
    // viewport.addChild(graphics);
    // graphics.lineStyle(10, 0xFFFFFF, 1);
    // graphics.drawCircle(0, 0, 1000);
    // graphics.drawCircle(0, 0, 4000);
    // graphics.drawCircle(0, 0, 6000);
    // graphics.drawCircle(0, 0, 8000);
    // graphics.alpha = 0;


    app.loader.load((loader, resources) => {
      for(let key in resources) {
        const imageSprite = new PIXI.Sprite(resources[key].texture);

        const clusterPos = positionDict[key].cluster_pos;

        imageSprite.x = 12 * app.renderer.width * (clusterPos[0] * 2 - 1);
        imageSprite.y = 12 * app.renderer.width * (clusterPos[1] * 2 - 1);

        imageSprite.anchor.x = 0.5;
        imageSprite.anchor.y = 0.5;
        imageSprite.alpha = 0;
        imageSprite.zIndex = 0;

        // resize images
        const max_dim = 300;
        let rs = Math.max(1, imageSprite.width/max_dim, imageSprite.height/max_dim);
        let newWidth = imageSprite.width/rs;
        let newHeight = imageSprite.height/rs;
        if (newWidth < max_dim || newHeight < max_dim) {
          newWidth = max_dim;
          newHeight = max_dim;
        }
        imageSprite.width = newWidth;
        imageSprite.height = newHeight;


        imageSprite.interactive = true;

        // erase
        imageSprite.id = index;
        imageSprite.fadeInTime = Math.random() * 300;

        const name = key;

        imageSprite.on('click', () => {
          setOverlay(positionDict[name]);

          // clicked = 0;
          // viewport.plugins.pause('wheel');
          // clicked++;
          // console.log("sprite " + clicked);
        });

        let lineGraphics = new PIXI.Graphics();
        viewport.addChild(lineGraphics);
        lineGraphics.lineStyle(10, 0xFFFFFF, 1);
        lineGraphics.alpha = 0;

        let ogHeight = imageSprite.height;
        let ogWidth = imageSprite.width;

        imageSprite.on('mouseover', () => {
          gsap.to(imageSprite, {
            height: ogHeight * 1.7,
            width: ogWidth * 1.7,
            zIndex: 2,
            duration: 0.3,
            ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          });

          // extract neighbors
          const neighborPos = positionDict[key].nearest_points;
          let scaledPos = [];

          for (let i = 0; i < neighborPos.length; i++) {
            let point = neighborPos[i];
            let newPoint = [];

            newPoint[0] = 12 * app.renderer.width * (point[0] * 2 - 1);
            newPoint[1] = 12 * app.renderer.width * (point[1] * 2 - 1);

            scaledPos[i] = newPoint;
          }

          // line graphics
          // TODO
          lineGraphics.alpha = 1;
          lineGraphics.zIndex = -5;

          for (let point of scaledPos) {
            lineGraphics.moveTo(imageSprite.x, imageSprite.y)
            lineGraphics.lineTo(point[0], point[1]);
          }

          // graphics.alpha = 1;
          // graphics.x = imageSprite.x;
          // graphics.y = imageSprite.y;
        });

        imageSprite.on('mouseout', () => {
          gsap.to(imageSprite, {
            height: ogHeight,
            width: ogWidth,
            zIndex: -1,
            duration: 0.3,
            ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          })

          imageSprite.hover = false;

          lineGraphics.alpha = 0;
          // graphics.alpha = 0;
        });


        viewport.addChild(imageSprite);

        sprites.push(imageSprite);
        index++;

      }
    });

    app.loader.onLoad.add(() => {
      let progress = Math.trunc(loadingNum++ / positions.length * 100);
      setLoadingProcess(progress)
    });

    app.loader.onComplete.add(() => {
      setLoadingComplete(!loadingComplete);

      // initial animation
      let time = 0
      app.ticker.add((delta) => {
        time++;

        sprites.forEach(i => {
          if(time > i.fadeInTime && i.alpha < 1) {
            i.alpha += .1;

            // increment range 0 < alpha <= 0.5
            // i.alpha += Math.random(0.5);
          }
        })
      })
    });


  }, [])



  return (
    <div className="App">
      {
        !loadingComplete &&
        <div className="loading-container">
          <span>Loading...</span>
          <span>{loadingProcess}</span>
        </div>
      }

      <canvas
        ref={canvas}
      />
      {overlay &&
        <Overlay
          details={overlay}
          setOverlay={setOverlay}
        />
      }
    </div>
  );
}

export default App;
