   
  /* 
   * Leap Trackball Controls
   * Author: @Cabbibo
   *
   * http://github.com/leapmotion/Leap-Three-Camera-Controls/    
   *    
   * Copyright 2014 LeapMotion, Inc    
   *    
   * Licensed under the Apache License, Version 2.0 (the "License");    
   * you may not use this file except in compliance with the License.    
   * You may obtain a copy of the License at    
   *    
   *     http://www.apache.org/licenses/LICENSE-2.0    
   *    
   * Unless required by applicable law or agreed to in writing, software    
   * distributed under the License is distributed on an "AS IS" BASIS,    
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.    
   * See the License for the specific language governing permissions and    
   * limitations under the License.    
   *    
   */    

  THREE.LeapTrackballControls = function ( object , controller , params, domElement ) {
	var _rotateXLast,_rotateYLast,_rotateZLast;
	var _panXLast,_panYLast,_panZLast;
    this.object     = object;
	console.log(this.object);
	this.rotationObject = null;
	this.rotateObject = false;
	this.step         = (object.position.z == 0 ? Math.pow(10, (Math.log(object.near) + Math.log(object.far))/Math.log(10))/10.0 : object.position.z);
    this.controller = controller;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    this.clock      = new THREE.Clock(); // for smoother transitions

    // Place the camera wherever you want it
    // but use a rotating object to place
    this.rotatingObject = new THREE.Object3D();

    this.rotatingCamera = new THREE.Object3D();
    this.rotatingCamera.position = this.object.position.clone();

    this.rotatingObject.add( this.rotatingCamera );

    this.zoomSpeed                = 0;
    
    
    //API

    this.rotationSpeed            = 10;
    this.rotationLowDampening     = .98;
    this.rotationHighDampening    = .7;
    this.rotationDampeningCutoff  = .9;
    
    this.zoomEnabled              = true;
    this.zoom                     = 40;
    this.zoomDampening            = .6;
    this.zoomCutoff               = .9;
    this.zoomSpeedRatio           = 10;

    this.minZoom                  = 20;
    this.maxZoom                  = 80;

    this.rotation = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3();


    this.getTorque = function( frame ){

      var torqueTotal = new THREE.Vector3();
      
      
      if( frame.hands[0] ){

        hand = frame.hands[0];
        
        var hDirection  = new THREE.Vector3().fromArray( hand.direction );
        var hNormal     = new THREE.Vector3().fromArray( hand.palmNormal );


        for( var i = 0; i < hand.fingers.length; i++ ){

          var finger = hand.fingers[i];

          if( finger.extended ){

            var fD = finger.direction;
            var fV = finger.tipVelocity;
            
            // First off see if the fingers pointed
            // the same direction as the hand
            var fDirection = new THREE.Vector3().fromArray( fD );
            var fMatch = fDirection.dot( hDirection );

            // See if the finger velocity is in the same direction
            // as the hand normal
            var fVelocity = new THREE.Vector3().fromArray( fV );
            var tmp = fVelocity.clone();
            var vMatch = Math.abs( tmp.normalize().dot( hNormal ) );


            // Dividing this.rotationSpeed by large number just to
            // keep parameters in a reasonable range
            var rotationSpeed = this.rotationSpeed / 100000;
            fVelocity.multiplyScalar( rotationSpeed * fMatch * vMatch );

            var torque = new THREE.Vector3().crossVectors( fVelocity , hDirection );
            torqueTotal.add( torque );

          }

        }

      }

      return torqueTotal;

    }
	
	this.setRotationObject = function(object){
		this.rotationObject = object;
	}
	
	this.setObjectRotation = function(flag){
		this.rotateObject = flag;
	};

    this.getRotationDampening = function( frame ){

      var dampening = this.rotationLowDampening;

      if( frame.hands[0] ){

        var handNormal = frame.hands[0].palmNormal;

        // only dampening if I'm giving a 'STOP' symbol to the camera
        if( -handNormal[2] > this.rotationDampeningCutoff ){
          dampening = this.rotationHighDampening;
        }
      }

      return dampening;

    }

    this.getZoomForce = function( frame ){

      var zoomForce = 0;

      if( frame.hands[0] ){

        var hand = frame.hands[0];
        var handNormal = new THREE.Vector3().fromArray( hand.palmNormal );

        if( Math.abs( handNormal.z ) > this.zoomCutoff ){

          var palmVelocity = new THREE.Vector3().fromArray( hand.palmVelocity );

          for( var i = 0; i < hand.fingers.length; i++ ){

            var finger = hand.fingers[i];

            if( finger.extended ){

              var fD = finger.direction;
              var fV = finger.tipVelocity;
              
              // First off see if the fingers pointed
              // the same direction as the hand
              var fDirection = new THREE.Vector3().fromArray( fD );
              
              var match = fDirection.dot( handNormal );

              // because fingers should be perp to handNormal, make the answer 1 - match
              var force = 1 - match;

              var fVelocity = new THREE.Vector3().fromArray( fV );
          
              var dir = fVelocity.dot( new THREE.Vector3( 0 , 0 , 1 ) );

              var zoomSpeedRatio = this.zoomSpeedRatio / 1000;
              zoomForce -= dir* zoomSpeedRatio;
           
            }

          }
        }
      } 
      return zoomForce;

    }

    this.update = function(){

      // making sure our matrix transforms don't get overwritten
      this.object.matrixAutoUpdate = false; 

      var frame     = this.controller.frame();

      var torque    = this.getTorque( frame );
      var dTime     = this.clock.getDelta();

      var rotationDampening   = this.getRotationDampening( frame );
      
      if( this.zoomEnabled ){

        var zoomForce = this.getZoomForce(  frame );
        
        this.zoomSpeed  += zoomForce * dTime;
        this.zoom       += this.zoomSpeed;
        this.zoomSpeed  *= this.zoomDampening;

        // Maxes sure that we done go below or above the max zoom!
        if( this.zoom > this.maxZoom ){

          this.zoom       = this.maxZoom;
          this.zoomSpeed  = 0;

        }else if( this.zoom < this.minZoom ){

          this.zoom       = this.minZoom;
          this.zoomSpeed  = 0;

        }

      }
		if(!this.rotateObject){
      this.angularVelocity.add( torque );
      this.angularVelocity.multiplyScalar( rotationDampening );
           
      var angularDistance = this.angularVelocity.clone().multiplyScalar( dTime );

      var axis  = angularDistance.clone().normalize();
      var angle = angularDistance.length();

      var rotationChange = new THREE.Quaternion();
      rotationChange.setFromAxisAngle( axis , angle );

      var rotation = new THREE.Quaternion();
      rotation.multiplyQuaternions( rotationChange , this.rotation );

      this.rotation = rotation;

      this.rotatingObject.rotation.setFromQuaternion( rotation );

      this.rotatingObject.updateMatrix();
      
		this.updateCameraPosition();
	  } else {
		this.updateObject();
	  }

    }
	
	this.panTransform = function(delta) {
		return 4 * THREE.Math.mapLinear(delta, -400, 400, -this.step, this.step);
	};
	
	this.updateObject = function() {
		var frame = this.controller.frame();
		var fingers = 0;
		if(frame.pointables.length > 0 && this.rotationObject != null){
			for(var i=0;i<frame.pointables.length;i++){
				if(frame.pointables[i].extended) {
					fingers++;
				}
			}
			if(fingers == 5){
				var pos = frame.pointables[1].tipPosition;
				
				var y = pos[0];
				if (!_rotateYLast) _rotateYLast = y;
				var yDelta = y - _rotateYLast;

				var x = pos[1];
				if(!_rotateXLast) _rotateXLast = x;
				var xDelta = x - _rotateXLast;

				var z = pos[2];
				if(!_rotateZLast) _rotateZLast = z;
				var zDelta = z - _rotateZLast;
				
				this.rotationObject.rotation.x += xDelta/50;
				this.rotationObject.rotation.y += yDelta/50;
				this.rotationObject.rotation.z += zDelta/50;
				
				_rotateXLast = x;
				_rotateYLast = y;
				_rotateZLast = z;
			} else if (fingers == 3) {
				console.log(" PAN OBJECT" );
				var pos = frame.pointables[1].tipPosition;
				var x = pos[0];
				var y = pos[1];
				var z = pos[2];
				if (!_panXLast) _panXLast = x;
				if (!_panYLast) _panYLast = y;
				if (!_panZLast) _panZLast = z;
				var xDelta = x - _panXLast;
				var yDelta = y - _panYLast;
				var zDelta = z - _panZLast;
				
				console.log(xDelta,yDelta,zDelta);
				console.log(_panXLast,_panYLast,_panZLast);
				
				this.rotationObject.position.x += xDelta;
				this.rotationObject.position.y += yDelta;
				this.rotationObject.position.z += zDelta;

				//var v = this.object.localToWorld(new THREE.Vector3(this.panTransform(xDelta), this.panTransform(yDelta), this.panTransform(zDelta)));
				//v.sub(this.object.position);
				//this.rotationObject.position.add(v);

				_panXLast    = x;
				_panYLast    = y;
				_panZLast    = z;
			}
		}
	}


    this.updateCameraPosition = function(){

      var matrix = this.rotatingObject.matrix;

      var inverse = new THREE.Matrix4().getInverse( matrix );

      var translationMatrix = new THREE.Matrix4();

      var pos = new THREE.Vector3( 0 , 0 , this.zoom );
      translationMatrix.setPosition( pos );

      var rotatedMatrix = new THREE.Matrix4();
      rotatedMatrix.multiplyMatrices( inverse , translationMatrix );

      this.object.matrix.copy( rotatedMatrix );
      this.object.matrixWorldNeedsUpdate = true;


      // Makes sure that if the camera is moving we are updating it
      this.rotatingCamera.position = this.object.position.clone();

      // Need to convert to world position here.
      var worldPosition = this.object.position.clone();
      worldPosition.applyMatrix4( this.rotatingObject.matrix );

      this.object.position = worldPosition;

      // The camera is always looking at the center of the object
      // it is rotating around.
      this.object.lookAt( this.rotatingObject.position );

    }

  }


  // This function moves from a position from leap space, 
  // to a position in scene space 
  this.leapToScene = function( position , clamp ){

    var clamp = clamp || false;
    var box = this.frame.interactionBox;
    var nPos = box.normalizePoint( position , clamp );
    
    nPos[0] = (nPos[0]-.5) * this.size;
    nPos[1] = (nPos[1]-.5) * this.size;
    nPos[2] = (nPos[2]-.5) * this.size;

    return new THREE.Vector3().fromArray( nPos );

  }
