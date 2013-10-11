var graph = function() {
    var b_width = 400,
            b_height = 30,
            coeficent = 100,
            update = false,
            stop = false,
            first_run = false,
            time_up = 1,
            start_time = 0,
            end_time = 0,
            canvas = null,
            context = null,
            Buffer_1 = null,
            Buffer_2 = null,
            contextBuffer_1 = null,
            contextBuffer_2 = null,
            left_pos = 0,
            min_val = 0,
            temp_m = b_width,
            temp_f = 0,
            pix_count = 0,
            dot_dl = 0,
            dot_up = 0,
            temp_n = 0,
            start_down_dot = 0,
            start_uplo_dot = 0,
            start_uplo = 0,
            start_down = 0,
            old_dot_up = 0,
            old_dot_dl = 0,
            inited = 0,
            seed_color = '#1db601',
            peer_color = '#0657ff';
    var graph_init = function(val)
    {
        canvas = document.getElementById("graph");
        if (!canvas) return;
        canvas.width = b_width;
        canvas.height = b_height;
        context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        Buffer_1 = document.createElement("canvas");
        Buffer_2 = document.createElement("canvas");
        Buffer_1.width = b_width;
        Buffer_2.width = b_width;
        Buffer_1.height = b_height;
        Buffer_2.height = b_height;
        contextBuffer_1 = Buffer_1.getContext("2d");
        contextBuffer_2 = Buffer_2.getContext("2d");
        contextBuffer_1.fillStyle = "#fff"; // Цвет заливки
        contextBuffer_1.fillRect(0, 0, Buffer_1.width, Buffer_1.height);
        contextBuffer_2.fillStyle = "#fff"; // Цвет заливки
        contextBuffer_2.fillRect(0, 0, Buffer_2.width, Buffer_2.height);
        time_up = val;
        inited = 1;
    };
    this.move_back = function(uplo, down, i)
    {
        if (!inited)
            return;
        var ts = (new Date()).getTime();
        if (i != null) {
            if (down > coeficent)
                coeficent = down;
            if (uplo > coeficent)
                coeficent = uplo;
            if (first_run === false)
            {
                if (uplo == 0 && down == 0)
                    return;
                old_dot_up = uplo * (b_height - 2) / coeficent;
                dot_up = uplo * (b_height - 2) / coeficent;
                old_dot_dl = down * (b_height - 2) / coeficent;
                dot_dl = down * (b_height - 2) / coeficent;
                first_run = true;
            }
            if (update) {
                stop = true;
                this.setTimeout(function() {
                    stop = false;
                    move_back(uplo, down, 'timer');
                }, 45);
                return;
            }
            update = true;
            start_time = ts;

            pix_count = 0;
            temp_n = 0;
            start_uplo_dot = dot_up;
            start_down_dot = dot_dl;
            start_uplo = uplo * (b_height - 2) / coeficent;
            start_down = down * (b_height - 2) / coeficent;
        }
        if (stop) {
            update = false;
            return;
        }

        if (start_uplo == 0)
            start_uplo = 0.01;
        if (start_down == 0)
            start_down = 0.01;
        var up = start_uplo_dot;
        var dl = start_down_dot;
        if (pix_count > 22) {
            update = false;
            end_time = ts;
            return;
        }
        pix_count++;
        if (left_pos <= b_width * 2)
        {
            context.drawImage(Buffer_1, canvas.width / 2 - min_val + temp_m - Buffer_1.width / 2, canvas.height / 2 - Buffer_1.height / 2);
            context.drawImage(Buffer_2, canvas.width / 2 - min_val + temp_f - Buffer_2.width / 2, canvas.height / 2 - Buffer_2.height / 2);
            if (left_pos == b_width * 2)
            {
                temp_m = min_val + b_width;
                contextBuffer_1.fillStyle = "#fff"; // Цвет заливки
                contextBuffer_1.fillRect(0, 0, Buffer_1.width, Buffer_1.height);
                coeficent = 0;
            }
            if (left_pos == b_width)
            {
                temp_f = min_val + b_width;
                contextBuffer_2.fillStyle = "#fff"; // Цвет заливки
                contextBuffer_2.fillRect(0, 0, Buffer_2.width, Buffer_2.height);
                coeficent = 0;
            }
            if (temp_m == b_width * 3)
            {
                min_val = 0;
                temp_m = b_width;
                temp_f = 0;
            }
        } else {
            left_pos = 0;
        }
        if (uplo > up)
        {
            uplo = up - start_uplo;
            var uplo_p = Math.sin(temp_n / 7 + 3.14 + 3.14 / 2).toFixed(2) * uplo / 2 + uplo / 2 + up;
        }
        else
        if (uplo < up)
        {
            uplo = up - start_uplo;
            var uplo_p = Math.sin(temp_n / 7 + 3.14 / 2).toFixed(2) * uplo / 2 + uplo / 2 + up - uplo;
        }
        else
            var uplo_p = uplo;

        if (down > dl)
        {
            down = dl - start_down;
            var down_p = Math.sin(temp_n / 7 + 3.14 + 3.14 / 2).toFixed(2) * down / 2 + down / 2 + dl;
        }
        else
        if (down < dl)
        {
            down = dl - start_down;
            var down_p = Math.sin(temp_n / 7 + 3.14 / 2).toFixed(2) * down / 2 + down / 2 + dl - down;
        }
        else
            var down_p = down;
        temp_n++;
        this.setTimeout(function() {
            paint_pixel(Math.round(uplo_p * 10) / 10, Math.round(down_p * 10) / 10);
            move_back(uplo, down);
        }, time_up * 45);
        min_val = min_val + 1;
        left_pos = left_pos + 1;
    };
    var paint_pixel = function(uplo_p, down_p)
    {
        dot_up = uplo_p;
        dot_dl = down_p;
        if (left_pos <= b_width)
        {
            contextBuffer_1.lineWidth = 1.1;
            contextBuffer_1.strokeStyle = peer_color;
            contextBuffer_1.beginPath();
            contextBuffer_1.moveTo(left_pos, b_height - 1 - dot_up);
            if (old_dot_up != null)
                contextBuffer_1.lineTo(left_pos - 1, b_height - 1 - old_dot_up);
            contextBuffer_1.stroke();
            contextBuffer_1.closePath();

            contextBuffer_1.strokeStyle = seed_color;
            contextBuffer_1.beginPath();
            contextBuffer_1.moveTo(left_pos, b_height - 1 - dot_dl);
            if (old_dot_dl != null)
                contextBuffer_1.lineTo(left_pos - 1, b_height - 1 - old_dot_dl);
            contextBuffer_1.stroke();
            contextBuffer_1.closePath();
        } else {
            contextBuffer_2.lineWidth = 1.1;
            contextBuffer_2.beginPath();
            contextBuffer_2.strokeStyle = peer_color;
            contextBuffer_2.moveTo(left_pos - b_width, b_height - 1 - dot_up);
            if (old_dot_up != null)
                contextBuffer_2.lineTo(left_pos - b_width - 1, b_height - 1 - old_dot_up);
            contextBuffer_2.stroke();
            contextBuffer_2.closePath();

            contextBuffer_2.beginPath();
            contextBuffer_2.strokeStyle = seed_color;
            contextBuffer_2.moveTo(left_pos - b_width, b_height - 1 - dot_dl);
            if (old_dot_dl != null)
                contextBuffer_2.lineTo(left_pos - b_width - 1, b_height - 1 - old_dot_dl);
            contextBuffer_2.stroke();
            contextBuffer_2.closePath();
        }
        old_dot_up = dot_up;
        old_dot_dl = dot_dl;
    };
    return {
        init: function(val) {
            graph_init(val);
        },
        move: function(a, b, c) {
            move_back(a, b, c);
        }
    };
}();