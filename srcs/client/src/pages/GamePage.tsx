import React, { MutableRefObject, useRef, useState } from 'react';
import { useEffect } from 'react';
import MainNavBar from '../components/layout/MainNavBar';
import { SocketContext } from '../socket/context';
import { useUser } from '../components/context/UserAuthContext';
import { Redirect  }from 'react-router';
import { useParams } from 'react-router-dom';
import './GamePage.css'



function GamePage(props: any): any {

    const socket = React.useContext(SocketContext);
    const { user, setUser } = useUser()!;
    const param: any = useParams();
    const room: number = param.room.substring(1);
    const [Players, setPlayers] = useState(["", ""]);
    const [Role, setRole] = useState("");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [Scores, setScores] = useState([0, 0])
    const [End, setEnd] = useState(false);
    const [Spectators, setSpectators] = useState<string[]>([]);
    var idTab = 0;
    let ctx: any;
    let canvas: any;
    let w: number;
    let h: number;

    function ListSpectators(spectator: string) {
        console.log('spect', spectator);
        idTab++;
        return (<li key={idTab}><div className="col userinfo">{spectator}</div></li>)
    }

    useEffect(() => {
        console.log('use');
        canvas = canvasRef.current;
        canvas!.width = canvas!.clientWidth;
        canvas!.height = canvas!.clientHeight;
        ctx = canvas!.getContext("2d");
    
        // ctx!.canvas.height = 3 * canvas!.width / 4;
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        w = canvas!.width;
        h = canvas!.height;
        console.log(w, h);
    }, [])

    useEffect(() => {
        socket.emit('game_info', room);
        socket.on('game', (data: any) => {
            if (!data.countdown)
            {
                ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
                ctx!.beginPath();
                ctx!.arc(data.bp.x * (w/100) , data.bp.y * (h/100), w/50 * (data.pw.type == -1 ? 0.5 : 1), 0, 2 * Math.PI);
                ctx!.fill();
                ctx!.fillStyle = data.pw.type == 0 ? 'red' : data.pw.type == 1 ? 'blue' : 'yellow';
                ctx!.beginPath();
                ctx!.arc(data.pw.x * (w/100) , data.pw.y * (h/100), w/10, 0, 2 * Math.PI);
                ctx!.fill();
                ctx!.stroke();
                ctx.fillStyle = "black";
                ctx!.fillRect(w/100, data.p1 * (h/100), w/40, h/5);
                ctx!.fillRect(w - w/40 - w/100, data.p2 * (h/100), w/40, h/5);
            }
            else if (data.countdown > 0)
            {
                ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
                ctx!.beginPath();
                ctx!.arc(data.bp.x * (w/100) , data.bp.y * (h/100), w/50, 0, 2 * Math.PI);
                ctx!.fill();
                ctx!.stroke();
                ctx.fillStyle = "black";
                ctx!.fillRect(w/100, data.p1 * (h/100), w/40, h/5);
                ctx!.fillRect(w - w/40 - w/100, data.p2 * (h/100), w/40, h/5);
                setScores([data.p1score, data.p2score]);
                if (!data.start) {
                    ctx!.font = '48px serif';
                    ctx!.fillText(`${Math.trunc(data.countdown / 50) + 1}`, w/2 - w/50, h/3);
                }
                if (data.end) {
                    setEnd(true);
                    ctx!.font = '24px serif';
                    ctx!.fillText((data.p1score == 5 ? `${Players[0]} WIN` : `${Players[1]} WIN`), w/2 - w/50, h/3);
                    socket.emit('stop_info', room);
                    setTimeout(() => {props.history.push(`/profile/:${user.username}`)}, 2000);
                }
            }
            else
            {
                ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
                ctx!.font = '12px serif';
                ctx!.fillText('opponent left : forfait win\nRedirecting to profile...', w/2, h/2);
                setTimeout(() => {props.history.push(`/profile/:${user.username}`)}, 2000);
            }
        })
        return (() => {
            socket.off('game');
        })
    }, [])

    useEffect(() => {
        socket.emit('game_start', {username: user.username, room: room});
        socket.on('role', (data: {players: string[], role: string}) => {
            setPlayers(data.players);
            setRole(data.role);
        })
        return(() => {
            socket.off('role');
        })
    }, [room, socket, user.username])

    useEffect(() => {
        var keyState: any;
        const handleKey = (e: any) => {
            console.log('event', Role);

            if (Role === 'player1' ||
                Role === 'player2') {
                keyState = e.key;
                // socket.emit('send_key', {key: e.key, role: Role, room: room});
            }
        }

        const handleKeyup = (e: any) => {
            console.log('event', Role);
            if (Role === 'player1' ||
                Role === 'player2') {
                if (keyState == e.key) {
                    socket.emit('keyup', {key: e.key, role: Role, room: room});
                    keyState = null;
                }
            }
        }

        window.addEventListener("keydown", handleKey);
        window.addEventListener("keyup", handleKeyup);
        let interval = setInterval(() => {
            socket.emit('send_key', {key: keyState, role: Role, room: room})
        }, 10);
        return(() => {
            window.removeEventListener("keydown", handleKey);
            window.removeEventListener("keyup", handleKeyup);
            clearInterval(interval);
        })
    }, [Players, Role, room, socket])

    useEffect(() => {
        socket.emit('get_spectators', room);
        socket.on('spectators', (data: string[]) => {
            setSpectators([]);
            console.log(data[0]);
            for (var i in data) {
                setSpectators([...Spectators, data[i]]);
            }
        })
        return (() => {
            socket.off('spectators');
        })
    }, [])

    if (user.id) {
        return (<div>
            <MainNavBar/>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-2 row-height">
                        <hr/>
                        <h5 id='subTitle'>Controls</h5>
                        <ul classname="ul">
                        <li> <div classname="col controls"> Arrows up/down : move pallet</div></li>
                        <li> <div classname="col controls"> F : surrender</div></li>
                        </ul>
                        <h5 id='subTitle'>PLAYERS</h5>
                        <div className="friendlist">
                            <ul className="ul">
                                <li><div className="col userinfo">{Players[0]} : {Scores[0]}</div></li>
                                <li><div className="col userinfo">{Players[1]} : {Scores[1]}</div></li>
                            </ul>
                        </div>
                        <hr/>
                        <h5 id='subTitle'>VIEWERS</h5>
                        <div className="friendlist">
                            <ul className="ul">
                            {Spectators.map((listvalue) => {
                                return (ListSpectators(listvalue))
                                })}
                            </ul>
                        </div>
                    </div>
                    <div className="col-10 row-game">
                        {!End ? <canvas id="bgCanvas" ref={canvasRef}></canvas> : 
                        Scores[0] == 5 ? `${Players[0]} WIN` : `${Players[1]} WIN`}
                    </div>
                </div>
            </div>
        </div>)
    }
    else {
        props.history.push('/login');
        return (<div/>);
    }
}

export default GamePage;
