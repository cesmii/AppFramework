class widgetFactory {
    constructor(id, item, childType, icon, clickHandler) {
        this.id = id;
        this.displayName = item.displayName;
        this.typeName = item.typeName.toLowerCase();
        this.instanceId = item.id;
        this.smipData = item;
        this.childType = childType;
        this.icon = icon;
        this.statusId = null;
        this.clickHandler = clickHandler;
    };

    build(self) {
        var newWidget = document.createElement("div");
        newWidget.id = this.id;
        newWidget.className = "widget machine " + this.typeName;
        newWidget.widget = self;
        var widgetTitle = document.createElement("p");
        widgetTitle.innerText = this.displayName;
        newWidget.appendChild(widgetTitle);
        var widgetIcon = document.createElement("img");
        widgetIcon.src = this.icon;
        widgetIcon.addEventListener("error", this.loadDefaultImage);
        widgetIcon.height = 32;
        widgetIcon.width = 32;
        newWidget.appendChild(widgetIcon);
        newWidget.addEventListener("click", this.clickHandler);
        if (this.typeName == this.childType) {
            var widgetStatus = document.createElement("div");
            widgetStatus.id = this.id.replace("station", "status");
            widgetStatus.className = "machine_status";
            widgetStatus.innerText = "<No Status>";
            newWidget.appendChild(widgetStatus);
        }
        return newWidget;
    };

    select(items) {
        for (var i=0;i<items.childNodes.length;i++) {   //unselect everything
            var widget = items.childNodes[i].widget;
            document.getElementById(widget.id).classList.remove("selected");
        }
        //select the specified item
        document.getElementById(this.id).classList.add("selected");
    };

    deSelect() {
        document.getElementById(this.id).classList.remove("selected");
    };

    loadDefaultImage() {
        logger.log("info", "Widget icon could not be found for specified type. Substituting default image.");
        this.src='unknown.png';
    };

    update(item) {
        document.getElementById(this.id).classList.remove("updating");
        var refresh = Math.floor(Math.random()*(4-1+1)+1);
        refresh = 1000 + (refresh * 100);
        setTimeout(() => {
            document.getElementById(this.id).classList.add("updating");
        }, refresh);
    };
}