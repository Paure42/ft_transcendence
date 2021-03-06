import axios from "axios";
import { useEffect, useState } from "react";
import MainNavBar from "../components/layout/MainNavBar";
import Utils from "../components/utils/utils"
import './ProfileDetailPage.css'
import { SocketContext } from '../socket/context'
import React from "react";
import { useUser } from '../components/context/UserAuthContext';
import { Redirect } from 'react-router';
import { Button } from "react-bootstrap";

function AdminPanel(props: any) {
    const [isLoading, setLoading] = useState(false); /* watched by useEffects() setLoading(true) asks the backed for data */
    const [Everyone, setEveryone] = useState([]);
    const [Channels, setChannels] = useState([]);
    const [Messages, setMessages] = useState([]);
    const [chanView, setChanView] = useState('');

    const socket = React.useContext(SocketContext);
    const { user } = useUser()!;

    let idUser: number = 0;
    let idChan: number = 0;
    let idMsg: number = 0;

    function reFresh() {
        setLoading(true);
    }

    function modClient(username: string, toggle: boolean) {
        if (username === 'fmoen') {
            Utils.notifyErr( 'who do you think you are ?' );
            return ;
        }
        axios.post(`/profile/mod_client`,
        { username: username,
          toggle: !toggle },
        { withCredentials: true })
        .then(() => {
            if (toggle) {
                socket.emit('request_mod_client',
                            username
                );
            }
            setLoading(true);
            Utils.notifySuccess('successfully modded ' + username);
        })
    }

    /* send ban request through a POST request. then log out user through websockets */

    function banClient(uname: string, toggle: boolean) {
        if (uname === 'fmoen') {
            Utils.notifyErr( 'cannot ban admin, he is too cool' );
            return ;
        }

        axios.post(`/profile/ban_client`,
        { username: uname,
             toggle: !toggle},
        { withCredentials: true })
        .then(() => {
            if (!toggle)
            {
                socket.emit('request_logout_client',
                    uname
                );
            }
            setLoading(true);
            Utils.notifySuccess('successfully banned ' + uname);
        })
    }


	function ListEveryone(everyone: any) {
        idUser++;
        return (
                <tr key={idUser}>
                    <th scope='row'>
                        <p>{idUser}</p>
                    </th>
                    <td>
                        <img src={everyone.avatar} alt="avatar" width="30" height="30"/>
                        <a href={'#profile/:' + everyone.username}>{everyone.username}</a>
                    </td>
                    <td><p>{everyone.status}</p></td>
                    <td><p>{everyone.wins}</p></td>
                    <td><p>{everyone.losses}</p></td>
                    <td><p>{everyone.elo}</p></td>
                    <td><p>
                    {everyone.ismod ?
                     <button type="button" onClick={(e: any) =>
                        modClient(everyone.username, everyone.ismod)}
                        className="btn btn-secondary">{"unmod " + everyone.username}</button> :
                     <button type="button" onClick={(e: any) =>
                        modClient(everyone.username, everyone.ismod)}
                        className="btn btn-secondary">{"mod " + everyone.username}</button> }
                    {everyone.isbanned ?
                     <button type="button" onClick={(e: any) =>
                        banClient(everyone.username, everyone.isbanned)}
                        className="btn btn-secondary">{"Unban " + everyone.username}</button> :
                     <button type="button" onClick={(e: any) =>
                        banClient(everyone.username, everyone.isbanned)}
                        className="btn btn-secondary">{"Ban " + everyone.username}</button> }
                    </p></td>
                </tr>
        )
    }

    function deleteChan(chan: string) {
        if (chan === 'General') {
            Utils.notifyErr('cannot delete general');
            return ;
        }
        axios.post(`/chat/deletechan`,
        { channel: chan },
        { withCredentials: true })
        .then(() => {
            socket.emit('request_destroy_channel', {
                'channel': chan});
            setLoading(true);
            Utils.notifySuccess('successfully deleted channel ' + chan);
        })
    }


    function setAdmin(adm: any, chan: string) {
        socket.emit('request_promote_client', {
            'channel': chan,
            'client': adm.value});
        setLoading(true);
        Utils.notifySuccess('succesfully set admin' + chan);
    }

    function viewLogs(channel: string) {
        setChanView(channel);
        setLoading(true);
    }

    // DONE : mapping is easy-peasy, yo
    // note : ???????????????

    function ListChannels(channels: any) {
        idChan++;
        let strid = idChan.toString();
        return (
                <tr key={idChan} >
                    <td><p>{channels.name}</p></td>
                    <td><p>{channels.clients.length}</p></td>
                    <td><Button type="button" onClick={() =>
                        deleteChan(channels.name)}
                                className="btn btn-secondary">{"delete " + channels.name}</Button></td>
                    <td>
                        <select className="adminselect" id={strid}>
                        {channels.clients.map((admin: any) => (
                            <option id={admin.value} value={admin.value}>
                            {admin}
                            </option>
                        ))}
                        </select>
                    <button type="button" onClick={(e: any) =>
                        setAdmin(document.getElementById(strid), channels.name)}
                                className="btn btn-secondary">{"set as admin"}</button>
                    </td>
                    <td><p>{channels.owner}</p></td>
                    <td>
                    <button type="button" onClick={() =>
                        viewLogs(channels.name)}
                                className="btn btn-secondary">Stealth Join</button>
                    </td>
                </tr>
        )
    }

	function ListMessages(messages: any) {
        idMsg++;
        return (
                <tr key={idMsg}>
                    <td><p>{messages.author}</p></td>
                    <td><p>{messages.content}</p></td>
                </tr>
        )
    }

    useEffect(() => {
        if (user.ismod === true)
        {
            axios.get(`/profile/all`,
                      { withCredentials: true})
                 .then((response) => {
                     if (response.data) {
                         setEveryone(response.data);
                         setLoading(false)
                     }
                 })
        }
    }, [isLoading, socket, user.username, props, user.id, user.ismod])

    useEffect(() => {
        if (user.ismod === true)
        {
            axios.post(`/chat/channels`,
                       {username : user.username},
                       {withCredentials: true})
                 .then((response) => {
                     if (response.data) {
                         setChannels(response.data);
                         setLoading(false);
                     }
                 })
        }
    }, [isLoading, socket, user.username, props, user.id, user.ismod])

    useEffect(() => {
        if (user.ismod === true)
        {
            axios.post(`/chat/messages`,
                       {channel : chanView},
                       {withCredentials: true})
                 .then((response) => {
                     if (response.data) {
                         setMessages(response.data);
                         setLoading(false);
                     }
                 })
        }
    }, [chanView, socket, user.username, props, user.id, user.ismod])

    if (user.ismod === false) {
        return (<Redirect to={{ pathname: "/profile/:"+user.username, state: { from: props.location} }} />);
    }
    else if (isLoading){
        return (<MainNavBar />)
    }
    else if (user.ismod === true){
        return (
            <div>
                <MainNavBar />
                <div className="px-4 py-3 mt-2">
                    <Button type="button" onClick={reFresh}> Refresh </Button>
                    <h3 style={{padding: '12px'}} className="mb-0 text-white text-center bg-dark">Users</h3>
                    <table id="ladderList" className="table table-striped bg-dark text-white"><thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Username</th>
                            <th scope="col">Status</th>
                            <th scope="col">Victories</th>
                            <th scope="col">Defeats</th>
                            <th scope="col">Elo</th>
                            <th scope="col">Danger Zone</th>
                        </tr>
                        {Everyone.map((listvalue) => {
                            return (ListEveryone(listvalue))
                        })}
                    </thead></table>
                </div>
                <div>
                    <h3 style={{padding: '12px'}} className="mb-0 text-white text-center bg-dark">Channels</h3>
                    <table id="chanlist" className="table table-striped bg-dark text-white">
                        <thead>
                            <tr>
                            <th scope="col">name</th>
                            <th scope="col">n of users</th>
                            <th scope="col">delete</th>
                            <th scope="col">set admin</th>
                            <th scope="col">owner</th>
                            <th scope="col">log</th>
                            </tr>
                            {Channels.map((listvalue) => {
                                return (ListChannels(listvalue));
                            })}
                        </thead>
                    </table>
                </div>
                <div>
                    <h3 style={{padding: '12px'}} className="mb-0 text-white text-center bg-dark">Messages</h3>
                    <table id="chanlist" className="table table-striped bg-dark text-white">
                        <thead>
                            <tr>
                            <th scope="col">author</th>
                            <th scope="col">content</th>
                            </tr>
                            {Messages.map((listvalue) => {
                                return (ListMessages(listvalue));
                            })}
                        </thead>
                    </table>
                </div>
            </div>
        );
    }
    else {
        return (<Redirect to={{ pathname: "/login", state: { from: props.location} }} />);
    }
}

export default AdminPanel;
