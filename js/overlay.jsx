'use strict';

// The bim data pane singleton.
let _bimDataPaneInstance;

// The bim data object.
let _bimDataConverter;

/**
 * JSON bim data lookup
 * @typedef {{
 *     StringData: string[],
 *     FaceToElementId: number[],
 *     ElementToProperties: Map<number, number[]>,
 *     ElementToFamilyInfo: Map<number, string[]>}} BimDataPayload
 */

 /**
  * Converts ray cast information into bim data.
  * @class
  * @property {BimDataPayload} bimData
  */
class BimDataConverter {

    /**
     * Constructor.
     * @param {BimDataPayload} bimData
     */
    constructor(bimData) {
        this.bimData = bimData;
    }

    /**
     * Returns the bim data associated with the intersection.
     * @param {*} intersection The Threejs intersection object.
     * @returns {{ name: string, type: string, familyName: string, properties: string[] }}
     */
    getBimData(intersection) {
        if (!intersection) {
            throw new Error("Invalid intersection", intersection);
        }

        if (!this.bimData) {
            throw new Error("Invalid bim data", this.bimData);
        }

        const {
            distance,
            point,
            face,
            faceIndex: raycastFaceIndex,
            object: meshObject,
            uv,
            uv2,
            instanceId } = intersection;

        // De-reference the element properties based on the given mesh object and intersected face.
        const faceGroupIds = meshObject.geometry.getAttribute("facegroupids").array;
        const elementId = this.bimData.FaceToElementId[faceGroupIds[raycastFaceIndex]];
        const rawElementProperties = this.bimData.ElementToProperties[elementId];

        // Populate the element information to return.
        const propertySet = new Set();
        for(let i = 0; i < rawElementProperties.length; i = i + 2) {

            const keyStringIndex = rawElementProperties[i];
            const valueStringIndex = rawElementProperties[i + 1];

            const key = this.bimData.StringData[keyStringIndex];
            const value = this.bimData.StringData[valueStringIndex];

            propertySet.add(`${key}: ${value}`);
        }
        const properties = [...propertySet];
        properties.sort();

        const [name, familyName, type] = this.bimData.ElementToFamilyInfo[elementId];

        return {
            name, familyName, type, properties,
        };
    }
}

class BimDataPane extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            show: false,
            title: "Title",
            family: "Family",
            type: "Type",
            parameters: [],
            count: 0,
        };
        // Assign ourselves as the instance singleton.
        _bimDataPaneInstance = this;
    }

    setBimData(title, family, type, parameters, count) {
        this.setState({...this.state, title, family, type, parameters: [...parameters], count });
    }

    display(enabled) {
        this.setState({...this.state, show: !!enabled });
    }

    render() {
        const { show, title, family, type, count, parameters } = this.state;
        if (!show) return null;

        return (
            <div className="bdc--pane">
                <div className="bdc--header">
                    <div
                        className="bdc--close far fa-times-circle"
                        onTouchEnd={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.display(false);
                        }}
                        onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.display(false);
                        }}
                    />
                    <div className="bdc--title scrollable-text custom-scrollbar">
                        {title}
                    </div>
                    <div className="bdc--label bdc--label__family">FAMILY</div>
                    <div className="bdc--value bdc--value__family scrollable-text custom-scrollbar">{family}</div>
                    <div className="bdc--label bdc--label__type">TYPE</div>
                    <div className="bdc--value bdc--value__type scrollable-text custom-scrollbar">{type}</div>
                    {/* <div className="bdc--label bdc--label__count">INSTANCES</div>
                    <div className="bdc--value bdc--value__count">{count}</div> */}
                </div>
                <div className="bdc--body custom-scrollbar">
                    <div className="bdc--body__subtitle">Parameters</div>
                    <div className="bdc--body__value-region">
                        {parameters.map((p, i) => (<div key={i} className="bdc--body__value">{p}</div>))}
                    </div>
                </div>
            </div>
        );
    }
}

const _longPressTimer = 1500;

// from: https://material-ui.com/components/progress/#customized-progress-bars
function LongPressIndicator() {
    const [completed, setCompleted] = React.useState(0);

    const interval = 50; // 50ms between updates
    const maxProgress = 100;
    const deltaPerFrame = (interval / (_longPressTimer * 0.65)) * maxProgress;

    React.useEffect(() => {

      function progress() {
        setCompleted(oldCompleted => {
          if (oldCompleted > maxProgress) {
            return maxProgress;
          }
          const _progress = Math.min(oldCompleted + deltaPerFrame, maxProgress);
          return _progress;
        });
      }
  
      const timer = setInterval(progress, interval);

      return () => {
        clearInterval(timer);
      };
    }, []);
  
    return (
      <div className="bdp--linear-progress-container">
        <MaterialUI.LinearProgress variant="determinate" value={completed} className="bdp--progress" />
      </div>
    );
}

/**
 * Point of interest
 * @typedef {{ x: number, y: number, z: number }} StrippedVector3
 * @typedef {{ x: number, y: number, z: number, w: number }} StrippedQuaternion
 * @typedef {{
 *     name: string,
 *     position: StrippedVector3,
 *     quaternion: StrippedQuaternion,
 *     target: StrippedVector3
 *  }} PointOfInterest
 */

 /** @returns {PointOfInterest} */
function createPointOfInterest(name, camera, controls) {
    const { position, quaternion } = camera;
    const { target } = controls;
    return {
        name,
        position: { x: position.x, y: position.y, z: position.z },
        quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        target: { x: target.x, y: target.y, z: target.z },
    };
}

const _defaultPointsOfInterest = [
    {
        name: "Front North West Corner",
        position: {
            x: -9.377683534029,
            y: 2.285000347655562,
            z: -10.301697684077448
        },
        quaternion: {
            x: -0.011590015284415554,
            y: 0.916829224571887,
            z: -0.02668401968295786,
            w: -0.3982182914058306
        },
        target: {
            x: 1.5659834396902248,
            y: 3.157401702405001,
            z: -0.08039301957603485
        }
    },
    {
        name: "Main Entrance",
        position: {
            x: -9.983965657116938,
            y: 2.1356461232801274,
            z: 11.893624313249816
        },
        quaternion: {
            x: 0.018712920011958446,
            y: -0.7010617861704771,
            z: 0.01840948116765151,
            w: 0.7126172111303685
        },
        target: {
            x: 4.993360335152902,
            y: 2.9228861019069177,
            z: 11.648758355367233
        }
    },
    {
        name: "Roof Mechanical Equipment",
        position: {
            x: -6.261961987258057,
            y: 25.028539499770595,
            z: -6.807631059709475
        },
        quaternion: {
            x: 0.1599534056544322,
            y: 0.8370229406527262,
            z: 0.32910670894868366,
            w: -0.4068123387577838
        },
        target: {
            x: 2.3741236475656153,
            y: 14.812312968990998,
            z: -0.02185620492782353
        }
    },
    {
        name: "Parking Garage",
        position: {
            x: 28.58003314739422,
            y: 1.7123825765557397,
            z: 24.06627299975684
        },
        quaternion: {
            x: -0.044144409571953994,
            y: 0.17133671100407566,
            z: 0.007685034974713913,
            w: 0.9841930414320591
        },
        target: {
            x: 23.53135872597716,
            y: 0.36948209649485686,
            z: 10.005422922781333
        }
    },
    {
        name: "Emergency Medical Rooms",
        position: {
            x: 29.70663877964936,
            y: 3.6530114466426347,
            z: 14.644072366936083
        },
        quaternion: {
            x: -0.10027609925272922,
            y: 0.5846664028130172,
            z: 0.07312744148559931,
            w: 0.8017245653228505
        },
        target: {
            x: 15.864384287440338,
            y: -0.04145766073647854,
            z: 10.200775326725768
        }
    }
];

class PoiNavigator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            poiList: _defaultPointsOfInterest,
            poiIndex: 0,
        };
    }

    storePointOfInterest() {
        if (!vim3d) {
            console.error("vim3d not detected.");
            return;
        }

        const { poiList } = this.state;

        const nextIndex = poiList.length;

        const poi = createPointOfInterest(
            `Point of Interest ${nextIndex}`,
            vim3d.camera,
            vim3d.controls);

        this.setState({
            ...this.state,
            poiList: [...poiList, poi],
            poiIndex: nextIndex,
        });
    }

    nextPointOfInterest(increment) {
        const { poiList, poiIndex } = this.state;
        if (poiList.length === 0) {
            return;
        }

        const nextIndex = (poiIndex + increment + poiList.length) % poiList.length;

        this.setState({
            ...this.state,
            poiIndex: nextIndex,
        });

        this.applyPoi(poiList[nextIndex]);
    }

    applyPoi(poi) {
        const { target, position, quaternion } = poi;
        const { controls, camera } = vim3d;

        controls.target.set(target.x, target.y, target.z);
        camera.position.set(position.x, position.y, position.z);
        camera.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }

    logPointsOfInterest() {
        const { poiList } = this.state;
        console.log(JSON.stringify(poiList, null, 4));
    }

    render() {
        const { poiList, poiIndex } = this.state;
        const hasPoi = poiList.length > 0;
        const currentPoi = hasPoi ? poiList[poiIndex] : null;

        return (
            <div className="poi">
                {
                    !hasPoi ? null :
                    <div className="poi--btn poi--prev" onClick={(evt) => this.nextPointOfInterest(-1)}>
                        <i className="fas fa-chevron-left"></i>
                    </div>
                }
                <div className="poi--name-container">
                    {/* <i className="fas fa-camera poi--btn" onClick={(evt) => this.storePointOfInterest()}></i>
                    <i className="fas fa-question poi--btn" onClick={(evt) => this.logPointsOfInterest()}></i> */}
                    { currentPoi ? <div className="poi--name" onClick={(evt) => this.nextPointOfInterest(0)}>{currentPoi.name}</div> : null }
                </div>
                {
                    !hasPoi ? null : 
                    <div className="poi--btn poi--next" onClick={(evt) => this.nextPointOfInterest(1)}>
                        <i className="fas fa-chevron-right poi--btn"></i>
                    </div>
                }
            </div>
        )
    }
}

class Overlay extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            longPressInitiated: false,
            startClientLocation: null,
        };
    }

    displayBimData(clientLocation) {
        const mouseCoords = vim3d.getEventMouseCoordinates(clientLocation);
        const intersections = vim3d.getRayCastIntersections(mouseCoords);
        if (intersections.length > 0) {

            const { name, familyName, type, properties } = _bimDataConverter.getBimData(intersections[0]);

            _bimDataPaneInstance.setBimData(
                name,
                familyName,
                type,
                properties,
                `0`
            );
            _bimDataPaneInstance.display(true);
        }
    }

    handleCompleteLongPress() {
        if (this.state.startClientLocation) {
            this.displayBimData(this.state.startClientLocation);
        }
        this.handleEndLongPress();
    }

    getCursorClientLocation(evt) {
        let cursorClientLocation = undefined;

        if (event.touches && event.touches.length > 0) {
            // single-touch
            cursorClientLocation = {
                clientX: evt.changedTouches[0].clientX,
                clientY: evt.changedTouches[0].clientY,
            };
        } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
            // mouse
            cursorClientLocation = {
                clientX: evt.clientX,
                clientY: evt.clientY,
            };
        }
        return cursorClientLocation;
    }

    handleBeginLongPress(evt) {
        if (evt.target.id !== "vimcanvas") {
            return;
        }

        if (!vim3d) {
            console.error("vim3d not detected.");
            return;
        }

        // If it's a touch event, only act if there is exactly one touch.
        if (evt.touches && evt.touches.length !== 1) {
            return;
        }
        evt.preventDefault();

        const startClientLocation = this.getCursorClientLocation(evt);
        if (startClientLocation) {
            this.setState({
                ...this.state,
                longPressInitiated: true,
                startClientLocation,
            });
            this._handleAbortLongPressReference = this.handleAbortLongPress.bind(this);
            document.addEventListener('mousemove', this._handleAbortLongPressReference);
            document.addEventListener('touchmove', this._handleAbortLongPressReference, { passive: false });

            this._handleEndLongPressReference = this.handleEndLongPress.bind(this)
            document.addEventListener('mouseout', this._handleEndLongPressReference);
            document.addEventListener('mouseup', this._handleEndLongPressReference);
            document.addEventListener('touchend', this._handleEndLongPressReference, { passive: false });

            this._handleCompleteLongPressReference = this.handleCompleteLongPress.bind(this);
            this._timeoutReference = window.setTimeout(this._handleCompleteLongPressReference, _longPressTimer);
        }
    }

    handleAbortLongPress(evt) {
        // check if the movement "wiggle" threshold has been exceeded.
        if (this.state.startClientLocation) {
            const { clientX: x1, clientY: y1 } = this.state.startClientLocation;
            const { clientX: x2, clientY: y2 } = this.getCursorClientLocation(evt);
            const dx = x2 - x1;
            const dy = y2 - y1;
    
            const threshold = 10; // 10 pixels
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance <= threshold) return;
        }

        // threshold exceeded; abort long press.
        this.handleEndLongPress(evt);
    }

    handleEndLongPress(evt) {
        if (evt) {
            evt.preventDefault();
        }

        this.setState({
            ...this.state,
            longPressInitiated: false,
            startClientLocation: null,
        });

        if (this._handleAbortLongPressReference) {
            document.removeEventListener('mousemove', this._handleAbortLongPressReference);
            document.removeEventListener('touchmove', this._handleAbortLongPressReference);
        }
        delete this._handleAbortLongPressReference;

        if (this._handleEndLongPressReference) {
            document.removeEventListener('mouseout', this._handleEndLongPressReference);
            document.removeEventListener('mouseup', this._handleEndLongPressReference);
            document.removeEventListener('touchend', this._handleEndLongPressReference);
        }
        delete this._handleEndLongPressReference;

        if (this._timeoutReference) {
            window.clearTimeout(this._timeoutReference);
        }
        delete this._timeoutReference;

        delete this._handleCompleteLongPressReference;
    }

    addLongPressListener() {
        this._handleBeginLongPressReference = this.handleBeginLongPress.bind(this);
        document.addEventListener('mousedown', this._handleBeginLongPressReference);
        document.addEventListener('touchstart', this._handleBeginLongPressReference, { passive: false });
    }

    removeLongPressListener() {
        if (this._handleBeginLongPressReference)
        {
            document.removeEventListener('mousedown', this._handleBeginLongPressReference);
            document.removeEventListener('touchstart', this._handleBeginLongPressReference);
        }
        delete this._handleBeginLongPressReference;
    }

    async componentDidMount() {
        try {
            const response = await fetch('./models/houston.bim.json');
            const bimData = await response.json();
            _bimDataConverter = new BimDataConverter(bimData);
        } catch (err) {
            console.error(err);
        }

        this.addLongPressListener();

        document.dispatchEvent(new Event('overlay-loaded'));
    }

    componentWillUnmount() {
        this.removeLongPressListener();
    }

    render() {
        return (
            <div className="overlay--root">
                <div class="overlay--nav">
                    <div id="logo"/>
                </div>
                <BimDataPane />
                { this.state.longPressInitiated ? <LongPressIndicator /> : null }
                <PoiNavigator/>
            </div>
        );
    }
}

ReactDOM.render(
    <Overlay />,
    document.querySelector('#overlay')
);
