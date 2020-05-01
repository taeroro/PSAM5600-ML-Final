import React, { useState, useEffect, useRef } from 'react';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import _ from 'lodash';

import Overlay from './Overlay';
import positions from './image_umap_position_neighbors';
import './App.css';


function App() {
  const [overlay, setOverlay] = useState(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(0);
  const [initSc, setInitSc] = useState(true);
  const canvas = useRef(null);
  const loadingScreen = useRef(null);

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
        imageSprite.key = key;
        imageSprite.fadeInTime = Math.random() * 300;

        const name = key;

        imageSprite.on('click', () => {
          setOverlay(positionDict[name]);

          // clicked = 0;
          // viewport.plugins.pause('wheel');
          // clicked++;
          // console.log("sprite " + clicked);
        });

        let linesArr = [];
        let lineGraphics = new PIXI.Graphics();
        lineGraphics.lineStyle(10, 0xFFFFFF, 1);
        lineGraphics.alpha = 0;


        // viewport.addChild(lineGraphics);


        let ogHeight = imageSprite.height;
        let ogWidth = imageSprite.width;

        let tl = [];

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
          lineGraphics.alpha = 1;
          lineGraphics.zIndex = -5;

          for (let point of scaledPos) {
            // lineGraphics.moveTo(imageSprite.x, imageSprite.y)
            // lineGraphics.lineTo(point[0], point[1]);


            // lineGraphics.endFill();
            viewport.addChild(lineGraphics);

            let p = 0; // percentage
            const ogX = imageSprite.x;
            const ogY = imageSprite.y;

            const drawLine = () => {
              if (p < 1.00)
                p += 0.05;
              else {
                lineGraphics.endFill();
                linesArr.push(lineGraphics);
                app.ticker.remove(drawLine);
              }

              lineGraphics.moveTo(ogX, ogY);
              lineGraphics.lineTo(ogX + (point[0] - ogX)*p, ogY + (point[1] - ogY)*p);
            }

            app.ticker.add(drawLine, PIXI.UPDATE_PRIORITY.NORMAL);

            // viewport.addChild(lineGraphics);
          }

          const nearestKey = positionDict[key].nearest_key;

          for (let tempKey in nearestKey) {
            const tempK = _.findKey(sprites, ['key', nearestKey[tempKey]]);
            const tempX = sprites[tempK].x;
            const tempY = sprites[tempK].y;

            if (tl[tempKey])
              tl[tempKey].kill();

            tl[tempKey] = gsap.timeline();


            let checkLineArr = [];

            const move = () => {
              let rX = randomNumber(tempX - 150, tempX + 150);
              let rY = randomNumber(tempY - 150, tempY + 150);
              let rTime = randomNumber(6, 10);

              const moveLine = () => {
                if (linesArr[tempKey]) {
                  if (!checkLineArr[tempKey]) {
                    checkLineArr[tempKey] = true;
                    app.ticker.add(moveLine, PIXI.UPDATE_PRIORITY.NORMAL);
                  }

                  // // line moving
                  // linesArr[tempKey].clear();
                  // linesArr[tempKey].lineStyle(10, 0xFFFFFF, 1);
                  // linesArr[tempKey].alpha = 1;
                  // linesArr[tempKey].moveTo(imageSprite.x, imageSprite.y);
                  // linesArr[tempKey].lineTo(sprites[tempK].x, sprites[tempK].y);
                  // linesArr[tempKey].endFill();
                }
              }

              moveLine();

              tl[tempKey].to(sprites[tempK], {
                x: rX,
                y: rY,
                duration: rTime,
                ease: "easeInOut",
                onComplete: move
              })
            }

            move();
          }
        });

        imageSprite.on('mouseout', () => {
          for (let i = 0; i < 5; i++) {
            tl[i].kill();

            if (linesArr[i]) {
              linesArr[i].alpha = 0;
            }
          }

          gsap.to(imageSprite, {
            height: ogHeight,
            width: ogWidth,
            zIndex: -1,
            duration: 0.3,
            ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          })

          const nearestKey = positionDict[key].nearest_key;

          for (let tempKey in nearestKey) {
            const tempK = _.findKey(sprites, ['key', nearestKey[tempKey]]);
            const tempClusterPos = positionDict[nearestKey[tempKey]].cluster_pos;

            gsap.to(sprites[tempK], {
              x: 12 * app.renderer.width * (tempClusterPos[0] * 2 - 1),
              y: 12 * app.renderer.width * (tempClusterPos[1] * 2 - 1),
              duration: 0.3,
              ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
            })
          }

          imageSprite.hover = false;
          // lineGraphics.alpha = 0;
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
      setTimeout(() => {
        gsap.to(loadingScreen.current, {
          duration: 0.5,
          opacity: 0,
          ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          onComplete: () => {
            setLoadingComplete(!loadingComplete);

            // initial animation
            let time = 0

            let isGsapArr = [];

            app.ticker.add((delta) => {
              time++;

              sprites.forEach((i, index) => {
                if (!isGsapArr[index]) {
                  isGsapArr[index] = true;
                  gsap.from(i, {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    duration: randomNumber(2, 5),
                    ease: "cubic-bezier(0.215, 0.61, 0.355, 1)",
                  })
                }

                if (time > i.fadeInTime && i.alpha < 1) {
                  i.alpha += .1;

                  // increment range 0 < alpha <= 0.5
                  // i.alpha += Math.random(0.5);
                }
              })
            })
          }
        });


      }, 1000);
    });


  }, [])

  function randomNumber(min, max) {
		return Math.floor(Math.random() * (1 + max - min) + min);
	}


  return (
    <div className="App">
      {
        initSc &&
        <div className="init-container">
          <h1>Faces of The Portraits</h1>
          <p>Machine learning algorithm explores face similarity of the portraits</p>

          <div className="start-bt" onClick={() => setInitSc(false)}>
            <span>Start</span>
          </div>
        </div>
      }

      {
        !loadingComplete &&
        <div className="loading-container" ref={loadingScreen}>
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
