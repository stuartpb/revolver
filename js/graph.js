var senators = new Array();
var lobbyists = new Array();

//sets main node for chart
var chartData = new Object();
chartData.name = "Congress";
var congressChildren = new Array();
//sets main node for chart

$( document ).ready(function() {

    //Load the data from some server
    $.getJSON("data/lobbyist_network.json", function(json) {
        var nodes = json.nodes;
        var links = json.links;

        var nodeId = 0;
        $.each(nodes, function(i, item) {
            if(item.type==="legislator"){
                var senator = new Senator({ name: item.id, idAttribute: nodeId});
                senators.push(senator);
                //console.log("Senator: " + senator.get("personId") + " " + senator.get("name"));
            }
            if(item.type==="lobbyist"){
                var lobbyist = new Lobbyist({ name: item.id, idAttribute: nodeId});
                lobbyists.push(lobbyist);
                $("#lobbyistList").append("<li>" + lobbyist.get("idAttribute") + " - " + lobbyist.get("name") + "</li>");
                //console.log("Lobbyist: " + lobbyist.get("personId") + " " + lobbyist.get("name"));
            }
            nodeId++;
        });

        var congressmen = new Congress(senators);
        var lobby = new Lobby(lobbyists);


        $.each(links, function(i, item) {

            //looks for senator in this link and updates total funding
            var sen = congressmen.find(function(model) {
                return model.get('idAttribute')===item.target;
            })
            if(sen!==undefined) {
                var beforeFunds = sen.get("totalFunds")
                var funds = beforeFunds;
                funds += item.weight;
                sen.set({"totalFunds": funds});
                //console.log("fundsBefore:" + beforeFunds +  " " + item.target + " " + sen.get("name") + " fundsAfter: " + sen.get("totalFunds"));


                //looks for lobbyist and adds it to the congressman list of sponsors
                var lob = lobby.find(function(model) {
                    return model.get('idAttribute')===item.source;
                })
                if(lob !== undefined){
                    lob.set("donation",item.weight);
                    var sponsors = sen.get("sponsors");
                    if(sponsors === undefined){
                        sponsors = new Lobby();
                    }
                    sponsors.add(lob);
                    sen.set("sponsors", sponsors);
                    //console.log("Before Sen:" + sen.get("name") + " Sponsor size: " + sen.get("sponsors").length);
                    sen.set("sponsors", sponsors);
                    //console.log("After Sen:" + sen.get("name") + " Sponsor size: " + sponsors.length);
                }
            }
            else {
                //console.log("Target not found : " + item.target);
            }
        });

        console.log("ready " + congressmen.length);


        //Loops through the final list and shows all legislators and which lobbyist sponsored them
        congressmen.each(function(man){
            var entry = "<li><b>" + man.get("idAttribute") + " - " + man.get("name") + " $ "  + Math.round(Number(man.get("totalFunds"))*100)/100  + " USD </b>";
            if(man.get("sponsors") !== undefined) {

                var congressObj = {name: man.get("name")};
                congressChildren.push(congressObj);
                var daLobby = man.get("sponsors");
                //console.log(man.get("name") + daLobby.length);
                entry = entry + "<ul>";
                var theSponsors = new Array();
                daLobby.each(function(lobbyEntry){
                    entry = entry + "<li>" + lobbyEntry.get("name") + " $ " + Math.round(Number(lobbyEntry.get("donation")*100)/100 )+  "</li>";
                    theSponsors.push({name:lobbyEntry.get("name") + " $" + Math.round(Number(lobbyEntry.get("donation")*100)/100 )});
                    congressObj.children = theSponsors;

                });
                entry = entry + "</ul></li>";
                $("#legislatorList").append(entry);


            }
        });
    });

    //********************************
    //chart rendering starts here....
    //********************************
    chartData.children = congressChildren;

    var m = [20, 120, 20, 120],
            w = 1280 - m[1] - m[3],
            h = 800 - m[0] - m[2],
            i = 0,
            root;

    var tree = d3.layout.tree()
            .size([h, w]);

    var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

    var vis = d3.select("#body").append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2])
            .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    root = chartData;
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
        if (d.children) {
            d.children.forEach(toggleAll);
            toggle(d);
        }
    }

    root.children.forEach(toggleAll);
    update(root);


    function update(source) {
        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = vis.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .on("click", function(d) { toggle(d); update(d); });

        nodeEnter.append("svg:circle")
                .attr("r", 1e-6)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("svg:text")
                .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
                .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) { return d.name; })
                .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
                .attr("r", 4.5)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
                .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();

        nodeExit.select("circle")
                .attr("r", 1e-6);

        nodeExit.select("text")
                .style("fill-opacity", 1e-6);

        // Update the links…
        var link = vis.selectAll("path.link")
                .data(tree.links(nodes), function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
                .transition()
                .duration(duration)
                .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
                .duration(duration)
                .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                })
                .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children.
    function toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }
    multi_graph.load();
});
