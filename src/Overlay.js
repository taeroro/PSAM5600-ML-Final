import React from 'react';
import './Overlay.css';

import text_data from './text_data';

function Overlay(props) {
  // const name = props.details.filename.split('/')[1];
  const url = "./" + props.details.filename;
  const id = props.details.filename.replace('resized_faces_gray/', '').replace('.jpg', '');
  const setOverlay = props.setOverlay;

  let name = '';
  let author = ''
  let description = '';

  for (let i = 0; i < Object.keys(text_data.id).length; i++) {
    if (id === text_data.id[i]) {
      name = text_data.title[i];
      author = text_data.author[i];
      description = text_data.description[i];
    }
  }

  return (
    <div className="Overlay">
      <button
        style={{
            backgroundImage: `url("https://img.icons8.com/material-sharp/64/111111/close-window.png")`,
        }}
        onClick={() => {
          setOverlay(null);
        }}
      ></button>
      <img src={`${url}`} alt="this is our description"/>
      <h1>{name}</h1>
      <h2>{author ? author : "No author provided"}</h2>
      <p>{description ? description : "No description provided"}</p>
    </div>
  );
}

export default Overlay;
